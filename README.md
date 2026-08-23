# 🚨 AlertIndia — Earliest Warning System

> **A real-time disaster alert, women safety, and air quality monitoring platform for India — built for the people, powered by open data.**

🔗 **[Live Demo → Click Here](https://script.google.com/macros/s/AKfycbzNDte4I0SvNumeWiJzKQ9p5k54EOFZT798frD_-b8P67ZaLhPeO0hyQKmjLn1kanRW/exec)**

---

## 🌟 What is AlertIndia?

AlertIndia is an earliest-warning web platform that gives Indian citizens real-time access to:
- 🌊 Flood risk based on live precipitation data
- 🌫️ Air Quality Index (AQI) with PM2.5 and PM10 readings
- 🌡️ Live weather conditions
- 📲 WhatsApp alert registration
- 🚁 Drone sighting reports
- 🛡️ Women safety SOS system with live location sharing
- ⭐ Community ratings and feedback

---

## ✨ Features

### 🌦️ Real-Time Weather & AQI
- Live temperature, humidity, wind speed, and feels-like data
- Real-time AQI with PM2.5 and PM10 readings via Open-Meteo API
- Location-based weather using GPS geolocation

### 🌊 Flood Risk Assessment
- Calculates flood risk (Low / Medium / High) based on live precipitation levels
- Updates automatically based on user's GPS location

### 📲 WhatsApp Alert Registration
- Users register with name, phone, and location
- Instant WhatsApp welcome message via Twilio
- Duplicate registration prevention
- Registered users receive earliest-warning alerts

### 🛡️ Guardian Shield — Women Safety SOS
- One-tap SOS alert sends live Google Maps location to trusted contacts via WhatsApp
- "I'm Safe" confirmation message
- Police/Admin notification system
- All SOS events logged with timestamp and coordinates

### 🚁 Drone Alert Reporting
- Citizens can report drone sightings
- Logs drone ID, alert type, coordinates, and severity
- Pending review system for authorities

### 📍 Reverse Geocoding
- Converts GPS coordinates to readable city/district names
- Powered by geocode.maps.co API

### ⭐ Community Rating System
- Users can rate the platform (1–5 stars)
- District-wise feedback with comments
- Live rating count displayed

### 👥 Visitor Tracking
- Real-time visitor count
- Session-based tracking with location

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, JavaScript |
| Backend | Google Apps Script (GAS) |
| Database | Google Sheets |
| Weather API | Open-Meteo (Free, No Key) |
| Air Quality API | Open-Meteo AQI (Free, No Key) |
| Geocoding API | geocode.maps.co |
| WhatsApp Alerts | Twilio WhatsApp Sandbox |
| Hosting | Google Apps Script Web App |
| Version Control | Git + GitHub + clasp |

---

## 🏗️ Architecture

```
User Browser
     │
     ▼
Google Apps Script Web App (doGet / doPost)
     │
     ├── Open-Meteo API (Weather + AQI)
     ├── geocode.maps.co (Reverse Geocoding)
     ├── Twilio API (WhatsApp Alerts)
     └── Google Sheets (Database)
           ├── Users
           ├── Visitors
           ├── Ratings
           ├── Comments
           ├── Alerts
           ├── Drone_Alerts
           ├── WomenSafety
           └── BWNotify
```

---

## 🚀 How to Use

1. Visit the **[Live App](https://script.google.com/macros/s/AKfycbzNDte4I0SvNumeWiJzKQ9p5k54EOFZT798frD_-b8P67ZaLhPeO0hyQKmjLn1kanRW/exec)**
2. Allow location access for real-time local weather and flood risk
3. Register your WhatsApp number to receive alerts
4. Use the Guardian Shield section for women safety SOS
5. Report drone sightings using the Drone Alert form
6. Rate the platform and leave feedback

---

## 👨‍💻 Team

| Name | Role |
|---|---|
| Dibyo Shankha Mukherjee | Frontend Lead & Master Integrator |
| Shreyan Chowdhury | Backend & GitHub Specialist |
| Koustav Paul | Alert Engine Logic & API Integration Specialist |
| Soham Bhattacharya | UI/UX & Testing |

---

## 🔐 Security

- All API keys and credentials stored in **Google Apps Script Properties** (never in code)
- `.gitignore` protects all sensitive files from GitHub
- No hardcoded secrets in any file

---

## 📡 API Endpoints

| Action | Method | Description |
|---|---|---|
| `?action=weather` | GET | Fetch live weather + AQI |
| `?action=get_status` | GET | Get latest alert status |
| `?action=get_ratings` | GET | Get community ratings |
| `?action=visitor_count` | GET | Get total visitor count |
| `action: register` | POST | Register for WhatsApp alerts |
| `action: ws_sos` | POST | Trigger women safety SOS |
| `action: drone` | POST | Report drone sighting |

---

## 📄 License

This project was built for the **GDGC Hackathon 2025** by Team AlertIndia.

---

*Built with ❤️ for a safer India 🇮🇳*
