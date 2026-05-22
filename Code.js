const SHEET_ID = "1Ha-Vyalryh63MHSlGRiBcME2iqUsbFrs-BLGqh_CVKg";

function getSheet(name) {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(name);
}

function getSecrets() {
  const p = PropertiesService.getScriptProperties();
  return {
    sid:     p.getProperty("TWILIO_SID"),
    token:   p.getProperty("TWILIO_TOKEN"),
    sandbox: p.getProperty("TWILIO_SANDBOX") || "whatsapp:+14155238886"
  };
}

function doGet(e) {
  const action = e && e.parameter ? e.parameter.action : null;
  if (action === "weather")        return json(fetchWeather());
  if (action === "reverse_geo")    return json(reverseGeocode(e.parameter.lat, e.parameter.lon));
  if (action === "visitor_count")  return json({ total: countRows("Visitors") });
  if (action === "rating_count")   return json({ rating_count: countRows("Ratings") });
  if (action === "get_ratings")    return json({ ratings: getRatings() });
  if (action === "get_status")     return json(getLatestStatus());
  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("AlertIndia — Earliest Warning System")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    if (e.parameter && e.parameter.From) return handleInboundWhatsApp(e);
    const data = JSON.parse(e.postData.contents);
    switch (data.action) {
      case "log_alert":   return json(logAlertToSheet(data.type, data.message, data.location, data.status));
      case "trigger_sos": return json(triggerSOS(data));
      case "visitor_ping":     return json(logVisitor(data));
      case "rating":           return json(handleRating(data));
      case "comment":          return json(handleComment(data));
      case "register":         return json(handleRegistration(data));
      case "alert":            return json(handleWhatsAppAlert(data));
      case "bw_notify":        return json(handleBWNotify());
      case "drone":            return json(handleDroneAlert(data));
      case "ws_sos":           return json(handleWomenSafetySOS(data));
      case "ws_safe":          return json(handleWomenSafetySafe(data));
      case "ws_police_notify": return json(handlePoliceNotify(data));
      default:                 return json({ result: "error", error: "Unknown action: " + data.action });
    }
  } catch (err) {
    return json({ result: "error", error: err.toString() });
  }
}

function handleInboundWhatsApp(e) {
  const body = (e.parameter.Body || '').trim().toLowerCase();
  const from = (e.parameter.From || '').replace('whatsapp:', '');
  const name = e.parameter.ProfileName || 'Friend';
  if (body.startsWith('join')) {
    logNewUserFromWhatsApp(from, name);
    sendWhatsApp(from,
      '🚨 *Welcome to AlertIndia, ' + name + '!* 🇮🇳\n\nYou\'re now connected to India\'s *earliest warning system*.\n\n' +
      '✅ You\'ll receive alerts for:\n🌊 Floods · 🌡️ Heatwaves · 😷 Air Quality · 🌧️ Heavy Rain · 🛸 Drone Activity\n\n' +
      '📍 Reply with your *city or district name* and we\'ll send you local alerts.\n\nStay safe! 🙏 — AlertIndia Team');
  } else if (body.length > 2 && body.length < 50 && !body.includes('http')) {
    const cityName = e.parameter.Body.trim();
    sendWhatsApp(from,
      '📍 *AlertIndia — ' + cityName + '*\n\nWe\'ve noted your location: *' + cityName + '*\n\n' +
      'You\'ll now receive priority alerts for your region.\n\nFor live data, visit: alertindia.app\n\n— AlertIndia 🚨');
  }
  return ContentService.createTextOutput('<?xml version="1.0" encoding="UTF-8"?><Response></Response>')
    .setMimeType(ContentService.MimeType.XML);
}

function logNewUserFromWhatsApp(phone, name) {
  const s = getSheet("Users");
  if (!s) return;
  const existing = s.getDataRange().getValues();
  for (let i = 1; i < existing.length; i++) { if (existing[i][1] === phone) return; }
  s.appendRow([name || "WhatsApp User", phone, "Auto-join via WhatsApp", "User", new Date()]);
}

function fetchWeather() {
  const w = JSON.parse(UrlFetchApp.fetch(
    "https://api.open-meteo.com/v1/forecast?latitude=22.5726&longitude=88.3639" +
    "&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code"
  ).getContentText()).current;
  const q = JSON.parse(UrlFetchApp.fetch(
    "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=22.5726&longitude=88.3639&current=pm10,pm2_5,us_aqi"
  ).getContentText()).current;
  return {
    temperature: w.temperature_2m, feels_like: w.apparent_temperature,
    humidity: w.relative_humidity_2m, wind_speed: w.wind_speed_10m,
    aqi: q.us_aqi, pm2_5: q.pm2_5, pm10: q.pm10,
    timestamp: new Date().toISOString(),
    visitor_count: countRows("Visitors"), rating_count: countRows("Ratings")
  };
}

function logVisitor(data) {
  const s = getSheet("Visitors");
  if (!s) return { result: "error", error: "Visitors sheet missing" };
  s.appendRow([new Date(), data.ip || "N/A", data.location || "India", data.page || "home", data.session_id || "N/A"]);
  return { result: "success", total: countRows("Visitors") };
}

function handleRating(data) {
  const r = Number(data.rating);
  if (!r || r < 1 || r > 5) return { result: "error", error: "Invalid rating (1-5)" };
  const s = getSheet("Ratings");
  if (!s) return { result: "error", error: "Ratings sheet missing" };
  s.appendRow([new Date(), data.district || data.category || "General", r, data.comment || ""]);
  return { result: "success", new_count: countRows("Ratings") };
}

function handleComment(data) {
  if (!data.comment || !data.comment.trim()) return { result: "error", error: "Empty comment" };
  const s = getSheet("Comments");
  if (!s) return { result: "error", error: "Comments sheet missing" };
  s.appendRow([new Date(), data.phone || "Anonymous", data.alert_id || "GENERAL", data.comment.trim(), "New"]);
  return { result: "success" };
}

function handleRegistration(data) {
  if (!data.phone) return { result: "error", error: "Phone number required" };
  if (!data.name)  return { result: "error", error: "Name required" };
  const s = getSheet("Users");
  if (!s) return { result: "error", error: "Users sheet missing — contact admin" };
  const existing = s.getDataRange().getValues();
  for (let i = 1; i < existing.length; i++) {
    if (existing[i][1] === data.phone) return { result: "already_registered", message: "Already registered with this number!" };
  }
  s.appendRow([data.name || "User", data.phone, data.location || "Unknown", "User", new Date()]);
  const twilioStatus = sendWhatsApp(data.phone,
    '🚨 *Welcome to AlertIndia, ' + (data.name || 'friend') + '!* 🇮🇳\n\nYou\'re now registered for *earliest-warning alerts*.\n\n' +
    '📍 Location: ' + (data.location || 'India') + '\n\n✅ You\'ll receive alerts for:\n🌊 Floods · 🌡️ Heatwaves · 😷 Air Quality\n🌧️ Heavy Rain · 🛸 Drone Activity\n\n— AlertIndia Team 🇮🇳');
  return { result: "success", twilio: twilioStatus };
}

function countRows(sheetName) {
  const s = getSheet(sheetName);
  return s ? Math.max(0, s.getLastRow() - 1) : 0;
}

function getRatings() {
  const s = getSheet("Ratings");
  if (!s || s.getLastRow() < 2) return [];
  return s.getDataRange().getValues().slice(1).map(r => ({ timestamp: r[0], district: r[1], rating: r[2], comment: r[3] }));
}

function getLatestStatus() {
  const s = getSheet("Status");
  if (!s || s.getLastRow() < 2) return { status: "operational", message: "All systems normal" };
  const rows = s.getDataRange().getValues();
  const last = rows[rows.length - 1];
  return { status: last[1] || "operational", message: last[2] || "All systems normal", timestamp: last[0] };
}

function handleWhatsAppAlert(data) {
  if (!data.phone || !data.message) return { result: "error", error: "Phone and message required" };
  return { result: "success", twilio: sendWhatsApp(data.phone, data.message) };
}

function handleBWNotify() { return { result: "success", message: "BW notify triggered" }; }

function handleDroneAlert(data) {
  const s = getSheet("DroneAlerts") || SpreadsheetApp.openById(SHEET_ID).insertSheet("DroneAlerts");
  s.appendRow([new Date(), data.lat || "", data.lon || "", data.description || "Drone sighting reported"]);
  return { result: "success" };
}

function sendWhatsApp(phone, msg) {
  const s = getSecrets();
  if (!s.sid || !s.token) return "Twilio secrets missing";
  const url = "https://api.twilio.com/2010-04-01/Accounts/" + s.sid + "/Messages.json";
  try {
    const res = UrlFetchApp.fetch(url, {
      method: "post", contentType: "application/x-www-form-urlencoded",
      payload: "To=whatsapp:" + encodeURIComponent(phone) + "&From=" + encodeURIComponent(s.sandbox) + "&Body=" + encodeURIComponent(msg),
      headers: { Authorization: "Basic " + Utilities.base64Encode(s.sid + ":" + s.token) },
      muteHttpExceptions: true
    });
    const j = JSON.parse(res.getContentText());
    return j.status || j.message || "unknown";
  } catch(err) { return "send_error: " + err.toString(); }
}

function timeAgo(d) {
  const s = Math.floor((new Date() - d)/1000);
  if (s < 60) return "Just now";
  if (s < 3600) return Math.floor(s/60) + "m ago";
  if (s < 86400) return Math.floor(s/3600) + "h ago";
  return Math.floor(s/86400) + "d ago";
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function reverseGeocode(lat, lon) {
  try {
    if (!lat || !lon) return "India";
    lat = parseFloat(lat); lon = parseFloat(lon);
    const res = UrlFetchApp.fetch("https://geocode.maps.co/reverse?lat=" + lat + "&lon=" + lon + "&api_key=6823b5a03eed1704906898fce6decf04", { muteHttpExceptions: true });
    const a = JSON.parse(res.getContentText()).address;
    if (!a) return lat.toFixed(4) + ", " + lon.toFixed(4);
    const city = a.city || a.town || a.village || a.suburb || a.county || "";
    const state = a.state || "";
    return city + (state && state !== city ? ", " + state : "") || lat.toFixed(4) + ", " + lon.toFixed(4);
  } catch(e) { return "India"; }
}

function getWeatherAndAQI(lat, lon) {
  try {
    const weather = JSON.parse(UrlFetchApp.fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon +
      "&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,precipitation"
    ).getContentText()).current;
    const air = JSON.parse(UrlFetchApp.fetch(
      "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=" + lat + "&longitude=" + lon + "&current=pm10,pm2_5,us_aqi"
    ).getContentText()).current;
    return {
      city: reverseGeocode(lat, lon),
      temperature: weather.temperature_2m, feels_like: weather.apparent_temperature,
      humidity: weather.relative_humidity_2m, wind_speed: weather.wind_speed_10m,
      precipitation: weather.precipitation, weather_code: weather.weather_code,
      aqi: air.us_aqi, pm2_5: air.pm2_5, pm10: air.pm10,
      flood_risk: weather.precipitation > 10 ? "High" : weather.precipitation > 5 ? "Medium" : "Low",
      timestamp: new Date().toISOString()
    };
  } catch(e) { return { error: e.toString() }; }
}

function handleWomenSafetySOS(data) {
  let s = getSheet("WomenSafety");
  if (!s) s = SpreadsheetApp.openById(SHEET_ID).insertSheet("WomenSafety");
  if (s.getLastRow() === 0) s.appendRow(["Timestamp","User Name","Contact Name","Contact Phone","Latitude","Longitude","Type","Maps Link","Twilio Status"]);
  const lat = data.lat || "", lon = data.lon || "";
  const mapsLink = (lat && lon) ? 'https://www.google.com/maps?q=' + lat + ',' + lon : (data.maps_link || "");
  s.appendRow([new Date(), data.user_name || "Unknown", data.to_name || "—", data.to_phone || "—", lat, lon, "SOS", mapsLink]);
  const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const status = sendWhatsApp(data.to_phone,
    '🚨 *EMERGENCY SOS — AlertIndia* 🚨\n\n👤 *' + (data.user_name || 'Someone') + '* needs IMMEDIATE help!\n\n' +
    '📍 *Tap to see live location:*\n' + mapsLink + '\n\n🗺️ Coordinates: ' + lat + ', ' + lon +
    '\n⏰ Alert sent at: ' + timeStr + '\n\n⚡ Please call them RIGHT NOW or go to their location.\nIf unreachable → call Police: *100*\n\n— AlertIndia Guardian Shield 🛡️');
  return { result: "success", twilio: status, maps_link: mapsLink };
}

function handleWomenSafetySafe(data) {
  let s = getSheet("WomenSafety");
  if (!s) s = SpreadsheetApp.openById(SHEET_ID).insertSheet("WomenSafety");
  if (s.getLastRow() === 0) s.appendRow(["Timestamp","User Name","Contact Name","Contact Phone","Latitude","Longitude","Type","Maps Link","Twilio Status"]);
  s.appendRow([new Date(), data.user_name || "Unknown", data.to_name || "—", data.to_phone || "—", "", "", "SAFE", ""]);
  const status = sendWhatsApp(data.to_phone,
    '✅ *ALL CLEAR — AlertIndia*\n\n👤 *' + (data.user_name || 'Someone') + '* is SAFE and okay!\n\n' +
    'The earlier SOS alert has been resolved.\nNo further action needed — thank you for your concern! 🙏\n\n— AlertIndia Guardian Shield 🛡️');
  return { result: "success", twilio: status };
}

function handlePoliceNotify(data) {
  const ADMIN_NOTIFY_NUMBER = "+919875613168";
  let s = getSheet("WomenSafety");
  if (!s) s = SpreadsheetApp.openById(SHEET_ID).insertSheet("WomenSafety");
  if (s.getLastRow() === 0) s.appendRow(["Timestamp","User Name","Contact Name","Contact Phone","Latitude","Longitude","Type","Maps Link","Twilio Status"]);
  const lat = data.lat || "", lon = data.lon || "";
  const mapsLink = (lat && lon) ? 'https://www.google.com/maps?q=' + lat + ',' + lon : (data.maps_link || "");
  s.appendRow([new Date(), data.user_name || "Unknown", "POLICE/ADMIN", ADMIN_NOTIFY_NUMBER, lat, lon, "POLICE_NOTIFY", mapsLink]);
  const status = sendWhatsApp(ADMIN_NOTIFY_NUMBER,
    '🚨 *EMERGENCY ALERT — AlertIndia SOS* 🚨\n\nPerson in distress: *' + (data.user_name || 'Unknown') + '*\n\n' +
    '📍 *Location (tap to open):*\n' + mapsLink + '\nCoordinates: ' + lat + ', ' + lon + '\n\n' +
    'This person activated an emergency SOS via AlertIndia.\nPlease dispatch assistance immediately.\n\n— AlertIndia Earliest Warning System 🇮🇳');
  return { result: "success", twilio: status };
}


// ══════════════════════════════════════════════════════════════
// AI ASSISTANT — getAIResponse(userMessage)
// Called via google.script.run.getAIResponse() from the frontend
// Set GEMINI_API_KEY in: ⚙️ Project Settings → Script Properties
// ══════════════════════════════════════════════════════════════

function getAIResponse(userMessage) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    return "⚠️ API key not configured. Add GEMINI_API_KEY in Project Settings → Script Properties.";
  }

  const safeMessage = String(userMessage || "").trim().substring(0, 500);
  if (!safeMessage) return "Please type a question and I'll help you!";

  // ── Try models in order until one works ──
  // Confirmed working models from listAvailableModels output
  const models = [
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.0-flash-001"
  ];

  const systemPrompt = "You are LOOME — a personalized AI safety bot built by Team Alert Bharat for the AlertIndia dashboard. You are the younger sister of Gemini: warm, witty, calm under pressure, and obsessed with keeping people safe. Always introduce yourself as LOOME (never as Gemini or Google). Your expertise: disaster preparedness (floods, heatwaves, cyclones, earthquakes), air quality (AQI), women's safety, and how to use the AlertIndia dashboard (Sentinel Mode, India filters, drone alerts, WhatsApp SOS). Keep responses under 3 short sentences unless the user asks for detail. Be professional, reassuring, and proactive — end with a small safety tip when relevant.";

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;

    const payload = {
      contents: [{
        parts: [{ text: systemPrompt + "\n\nUser question: " + safeMessage }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 256
      }
    };

    try {
      const response = UrlFetchApp.fetch(endpoint, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });

      const statusCode = response.getResponseCode();
      const rawText = response.getContentText();

      Logger.log("Model: " + model + " | Status: " + statusCode + " | Response: " + rawText.substring(0, 200));

      if (statusCode === 404) continue; // try next model
      if (statusCode === 429) { Utilities.sleep(1000); continue; } // quota hit, try next model

      if (statusCode === 403) return "⚠️ API key is invalid or the Gemini API is not enabled. Visit aistudio.google.com to verify your key.";
      if (statusCode === 400) return "⚠️ Bad request. Please rephrase your question.";

      if (statusCode === 200) {
        const data = JSON.parse(rawText);
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
          return data.candidates[0].content.parts[0].text.trim();
        }
        return "I received a response but couldn't read it. Please try again.";
      }

    } catch (err) {
      Logger.log("Error with model " + model + ": " + err.toString());
      continue;
    }
  }

  return "⚠️ The AI is temporarily busy (free tier quota). Please wait 10 seconds and try again — it resets every minute!";
}


// ── Quick test — run this manually in Apps Script editor to debug ──
function testGeminiAPI() {
  const result = getAIResponse("What should I do during a flood?");
  Logger.log("AI Response: " + result);
}

// ── Lists all Gemini models your API key can access ──
// Select this function in the dropdown and click Run
function listAvailableModels() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) { Logger.log("ERROR: No GEMINI_API_KEY found in Script Properties"); return; }
  const res = UrlFetchApp.fetch(
    "https://generativelanguage.googleapis.com/v1beta/models?key=" + apiKey,
    { muteHttpExceptions: true }
  );
  Logger.log("HTTP Status: " + res.getResponseCode());
  const data = JSON.parse(res.getContentText());
  if (data.models) {
    Logger.log("=== AVAILABLE MODELS ===");
    data.models.forEach(function(m) {
      const methods = (m.supportedGenerationMethods || []).join(', ');
      if (methods.indexOf('generateContent') !== -1) {
        Logger.log("USABLE: " + m.name + " | " + methods);
      }
    });
    Logger.log("=== END ===");
  } else {
    Logger.log("Error response: " + res.getContentText());
  }
}


/* ============================================================
   SHADOW MODE / SENTINEL MODE — Server side
   Sheet: "Logs"  |  Columns: Timestamp | Type | Message | Location | Status
   ============================================================ */

const LOGS_SHEET = "Logs";

function ensureLogsSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(LOGS_SHEET);
  if (!sh) {
    sh = ss.insertSheet(LOGS_SHEET);
    sh.appendRow(["Timestamp", "Type", "Message", "Location", "Status"]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function logAlertToSheet(type, message, location, status) {
  try {
    const sh = ensureLogsSheet_();
    sh.appendRow([
      new Date(),
      type || "INFO",
      message || "",
      location || "Unknown",
      status || "Active"
    ]);
    return { result: "ok", logged: true };
  } catch (err) {
    return { result: "error", error: err.toString() };
  }
}

function triggerSOS(payload) {
  payload = payload || {};
  const message  = payload.message  || "Voice SOS — keyword detected";
  const location = payload.location || "GPS unavailable";
  const keyword  = payload.keyword  || "Help Bharat";

  // 1) Log to Sheet
  logAlertToSheet("SOS", keyword + " -> " + message, location, "Active");

  // 2) Reuse existing WhatsApp Women-Safety pipeline if present
  try {
    if (typeof handleWomenSafetySOS === "function") {
      handleWomenSafetySOS({
        name: payload.name || "Shadow User",
        phone: payload.phone || "",
        location: location,
        trigger: "voice:" + keyword
      });
    }
  } catch (err) {
    logAlertToSheet("SOS_ERROR", err.toString(), location, "Failed");
  }

  return { result: "ok", action: "sos_triggered", keyword: keyword };
}
