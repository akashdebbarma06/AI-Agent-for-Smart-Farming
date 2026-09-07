"""
KrishiMitra AI — Agentic Tools.

Provides real or stubbed data for weather and mandi prices.
"""

import datetime

def get_weather(location: str = "your region") -> str:
    """Fetch weather for a given location. Stubbed for demo purposes."""
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    return (
        f"**Live Weather Data Unavailable (Demo Mode)**\n"
        f"Simulated forecast for {location} (Timestamp: {now}):\n"
        f"Temperature: 28°C\n"
        f"Humidity: 65%\n"
        f"Forecast: Clear skies. Safe window for pesticide application is between 8 AM and 11 AM."
    )

def get_mandi_prices(commodity: str = "crop", location: str = "local mandi") -> str:
    """Fetch Mandi prices. Stubbed for demo purposes."""
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    return (
        f"**Live e-NAM Data Unavailable (Demo Mode)**\n"
        f"Simulated APMC modal price for {commodity} in {location} (Timestamp: {now}):\n"
        f"Arrivals: 150 Quintals\n"
        f"Modal Price: ₹4,500 / Quintal\n"
        f"Trend: Stable compared to yesterday."
    )
