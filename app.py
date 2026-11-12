"""Car vs transit: what it takes to move the same number of commuters through a city."""

import json
import math
from pathlib import Path

import altair as alt
import pandas as pd
import streamlit as st
import streamlit.components.v1 as components

# Tailpipe CO2 per gallon (US EPA)
CO2_PER_GAL_GAS = 8.887     # kg
CO2_PER_GAL_DIESEL = 10.18  # kg
LB_TO_KG = 0.453592

MODES = ["Cars", "Bus", "Streetcar", "Subway"]
COLORS = ["#d9480f", "#1971c2", "#2f9e44", "#7048e8"]

st.set_page_config(page_title="Car vs Transit", page_icon="🚇", layout="wide")

# ---------- Sidebar: assumptions ----------
with st.sidebar:
    st.header("Assumptions")

    st.subheader("Car")
    car_mpg = st.number_input("Fuel economy (mpg)", min_value=1.0, value=22.2, step=0.1, key="car_mpg")
    car_occ = st.number_input("People per car", min_value=1.0, value=1.0, step=0.1)
    car_space = st.number_input("Lane space per car (ft)", min_value=1, value=20, step=1)

    st.subheader("Bus")
    bus_mpg = st.number_input("Fuel economy (mpg, diesel)", min_value=0.5, value=3.6, step=0.1, key="bus_mpg")
    bus_cap = st.number_input("Riders per bus", min_value=1, value=40, step=1)
    bus_space = st.number_input("Lane space per bus (ft)", min_value=1, value=45, step=1)

    st.subheader("Streetcar")
    sc_kwh = st.number_input("Electricity (kWh per vehicle mile)", min_value=0.1, value=8.4, step=0.1)
    sc_cap = st.number_input("Riders per streetcar", min_value=1, value=125, step=1)
    sc_space = st.number_input("Lane space per streetcar (ft)", min_value=1, value=72, step=1)

    st.subheader("Subway")
    sub_kwh = st.number_input("Electricity (kWh per car mile)", min_value=0.1, value=5.9, step=0.1)
    sub_cap = st.number_input("Riders per subway car", min_value=1, value=110, step=1)

    st.subheader("Power grid")
    grid_lb = st.number_input("Grid CO2 (lb per MWh)", min_value=0.0, value=771.5, step=10.0)

    st.markdown("---")
    st.subheader("Sources")
    st.markdown(
        "- Gasoline produces 8,887 g of CO2 per gallon and diesel produces 10,180 g "
        "([US EPA](https://www.epa.gov/greenvehicles/greenhouse-gas-emissions-typical-passenger-vehicle)).\n"
        "- 22.2 mpg is the EPA figure for the average gasoline vehicle on the road "
        "([US EPA](https://www.epa.gov/node/131759)).\n"
        "- 3.6 mpg is in the range reported for 40 ft diesel transit buses, about 3.6 to 4.2 mpg "
        "([USDOT](https://rosap.ntl.bts.gov/view/dot/31283/dot_31283_DS1.pdf), "
        "[NREL](https://www.nrel.gov/grid/news/program/2016/nrel-fuel-cell-bus-analysis-finds-fuel-economy-to-be-14-times-higher-than-diesel)).\n"
        "- Subway and streetcar electricity: US heavy rail used 3,683 million kWh over 621 million car miles "
        "(about 5.9 kWh per car mile) and light rail used 510 million kWh over 61 million vehicle miles "
        "(about 8.4) in 2002 "
        "([BTS Transit Profile](https://webarchive.library.unt.edu/eot2008/20090510110610/http:/www.bts.gov/publications/national_transportation_statistics/2003/html/table_transit_profile.html)). "
        "Streetcars are counted as light rail.\n"
        "- Grid CO2: 771.5 lb per MWh, the US average in EPA eGRID 2023 "
        "([US EPA](https://www.epa.gov/egrid/summary-data)). Your local grid may be cleaner or dirtier.\n"
        "- Streetcar: a common US model is 66.5 ft long and carries 125 to 150 riders fully loaded "
        "([Brookville Liberty](https://www.wikipedia.org/wiki/Brookville_Liberty)). "
        "72 ft of lane adds a 5 ft gap.\n"
        "- Subway: New York City Transit schedules 110 riders per car at peak on its 51 ft cars "
        "([source](https://bqrail.substack.com/p/railcar-capacity-and-human-body-size)). "
        "Subways run underground, so they use no street space.\n"
        "- Riders per bus, people per car, and car and bus lane space are simple assumptions "
        "(a 15 ft car plus a 5 ft gap, a 40 ft bus plus a 5 ft gap).\n"
        "- Only CO2 from the trip itself is counted: tailpipe for cars and buses, power plants for rail."
    )

# ---------- Header and controls ----------
st.title("Car vs Transit")
st.caption("What it takes to move the same number of commuters through a city: by car, bus, streetcar, or subway.")

c1, c2 = st.columns([2, 1])
commuters = c1.slider("Commuters", min_value=1, max_value=300, value=40)
miles = c2.slider("Trip length (miles)", min_value=1, max_value=30, value=10)

# ---------- Calculations ----------
grid_kg_per_kwh = grid_lb * LB_TO_KG / 1000

cars = math.ceil(commuters / car_occ)
buses = math.ceil(commuters / bus_cap)
streetcars = math.ceil(commuters / sc_cap)
subway_cars = math.ceil(commuters / sub_cap)

vehicles = {"Cars": cars, "Bus": buses, "Streetcar": streetcars, "Subway": subway_cars}

fuel = {
    "Cars": cars * miles / car_mpg,
    "Bus": buses * miles / bus_mpg,
    "Streetcar": 0.0,
    "Subway": 0.0,
}
electricity = {
    "Cars": 0.0,
    "Bus": 0.0,
    "Streetcar": streetcars * miles * sc_kwh,
    "Subway": subway_cars * miles * sub_kwh,
}
co2 = {
    "Cars": fuel["Cars"] * CO2_PER_GAL_GAS,
    "Bus": fuel["Bus"] * CO2_PER_GAL_DIESEL,
    "Streetcar": electricity["Streetcar"] * grid_kg_per_kwh,
    "Subway": electricity["Subway"] * grid_kg_per_kwh,
}
space = {
    "Cars": cars * car_space,
    "Bus": buses * bus_space,
    "Streetcar": streetcars * sc_space,
    "Subway": 0,
}

# CO2 per vehicle mile, used to find how many riders a transit vehicle needs to beat the cars
car_co2_per_person_mile = CO2_PER_GAL_GAS / car_mpg / car_occ
co2_per_vehicle_mile = {
    "Bus": CO2_PER_GAL_DIESEL / bus_mpg,
    "Streetcar": sc_kwh * grid_kg_per_kwh,
    "Subway": sub_kwh * grid_kg_per_kwh,
}
capacity = {"Bus": bus_cap, "Streetcar": sc_cap, "Subway": sub_cap}

# ---------- Street animation ----------
street_js = (Path(__file__).parent / "street.js").read_text()
scene = {
    "cars": cars,
    "buses": buses,
    "streetcars": streetcars,
    "subwayCars": subway_cars,
    "commuters": commuters,
    "busCap": int(bus_cap),
    "streetcarCap": int(sc_cap),
    "subwayCap": int(sub_cap),
}
components.html(
    f"""
    <canvas id="street" width="960" height="520"
            style="width:100%;height:auto;display:block;border-radius:10px;"></canvas>
    <script>
      const SCENE = {json.dumps(scene)};
      {street_js}
    </script>
    """,
    height=545,
)

# ---------- Summary ----------
who = "1 commuter" if commuters == 1 else f"{commuters} commuters"
winners, losers = [], []
for mode in ["Bus", "Streetcar", "Subway"]:
    if co2[mode] < co2["Cars"]:
        winners.append(
            f"- **{mode}:** {co2['Cars'] - co2[mode]:,.1f} kg less CO2 and "
            f"{space['Cars'] - space[mode]:,.0f} ft less street space"
        )
    else:
        riders_needed = math.floor(co2_per_vehicle_mile[mode] / car_co2_per_person_mile) + 1
        if riders_needed <= capacity[mode]:
            losers.append(f"- **{mode}:** needs about {riders_needed} riders to beat the cars on CO2")
        else:
            losers.append(f"- **{mode}:** does not beat the cars on CO2 even when full, with these settings")

if winners:
    st.success(f"Compared with driving, moving **{who}** {miles} miles by:\n" + "\n".join(winners))
if losers:
    st.warning(f"With only **{who}**, some transit vehicles are mostly empty:\n" + "\n".join(losers))

# ---------- Key numbers ----------
st.subheader("Each option vs driving")
cols = st.columns(3)
for col, mode in zip(cols, ["Bus", "Streetcar", "Subway"]):
    with col:
        st.markdown(f"**{mode}**")
        st.metric("CO2 (kg)", f"{co2[mode]:,.1f}", f"{co2[mode] - co2['Cars']:+,.1f} vs cars", delta_color="inverse")
        st.metric("Street space (ft)", f"{space[mode]:,}", f"{space[mode] - space['Cars']:+,} vs cars", delta_color="inverse")

# ---------- Comparison chart ----------
metrics = [
    ("Vehicles needed", vehicles),
    ("Fuel burned (gal)", fuel),
    ("Electricity used (kWh)", electricity),
    ("CO2 emitted (kg)", co2),
    ("Street space used (ft)", space),
    ("CO2 per commuter (kg)", {m: co2[m] / commuters for m in MODES}),
]
df = pd.DataFrame(
    [{"Metric": name, "Mode": m, "Value": values[m]} for name, values in metrics for m in MODES]
)

chart = (
    alt.Chart(df)
    .mark_bar(cornerRadiusEnd=4)
    .encode(
        y=alt.Y("Mode:N", title=None, sort=MODES),
        x=alt.X("Value:Q", title=None),
        color=alt.Color("Mode:N", scale=alt.Scale(domain=MODES, range=COLORS), legend=None),
        tooltip=["Metric", "Mode", alt.Tooltip("Value:Q", format=",.2f")],
    )
    .properties(height=110, width=620)
    .facet(
        row=alt.Row(
            "Metric:N",
            title=None,
            sort=[m[0] for m in metrics],
            header=alt.Header(labelAngle=0, labelAlign="left"),
        )
    )
    .resolve_scale(x="independent")
)

st.subheader("All four side by side")
st.altair_chart(chart)

with st.expander("See the numbers"):
    table = pd.DataFrame({name: values for name, values in metrics}).T[MODES]
    st.dataframe(table.style.format("{:,.2f}"), use_container_width=True)
