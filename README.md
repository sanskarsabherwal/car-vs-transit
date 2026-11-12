# Car vs Transit

A Streamlit app that shows what it takes to move the same number of commuters through a city: by car, bus, streetcar, or subway. Two sliders set the number of commuters and the trip length. An animated city street shows the cars, buses, and streetcars needed, with the subway running underground. The app then compares the four options on vehicles needed, fuel burned, electricity used, CO2 emitted, street space used, and CO2 per commuter. All assumptions can be changed in the sidebar.

## Run it locally

```bash
git clone https://github.com/sanskarsabherwal/car-vs-transit.git
cd car-vs-transit
python -m venv venv
source venv/bin/activate   # on Windows: venv\Scripts\activate
pip install -r requirements.txt
streamlit run app.py
```

The app opens at http://localhost:8501.

## Data sources

- Gasoline produces 8,887 g of CO2 per gallon and diesel produces 10,180 g ([US EPA](https://www.epa.gov/greenvehicles/greenhouse-gas-emissions-typical-passenger-vehicle)).
- 22.2 mpg is the EPA figure for the average gasoline vehicle on the road ([US EPA](https://www.epa.gov/node/131759)).
- 3.6 mpg is in the range reported for 40 ft diesel transit buses, about 3.6 to 4.2 mpg ([USDOT](https://rosap.ntl.bts.gov/view/dot/31283/dot_31283_DS1.pdf), [NREL](https://www.nrel.gov/grid/news/program/2016/nrel-fuel-cell-bus-analysis-finds-fuel-economy-to-be-14-times-higher-than-diesel)).
- Subway and streetcar electricity: US heavy rail used 3,683 million kWh over 621 million car miles (about 5.9 kWh per car mile) and light rail used 510 million kWh over 61 million vehicle miles (about 8.4) in 2002 ([BTS Transit Profile](https://webarchive.library.unt.edu/eot2008/20090510110610/http:/www.bts.gov/publications/national_transportation_statistics/2003/html/table_transit_profile.html)). Streetcars are counted as light rail.
- Grid CO2: 771.5 lb per MWh, the US average in EPA eGRID 2023 ([US EPA](https://www.epa.gov/egrid/summary-data)). Your local grid may be cleaner or dirtier.
- Streetcar: a common US model is 66.5 ft long and carries 125 to 150 riders fully loaded ([Brookville Liberty](https://www.wikipedia.org/wiki/Brookville_Liberty)). 72 ft of lane adds a 5 ft gap.
- Subway: New York City Transit schedules 110 riders per car at peak on its 51 ft cars ([source](https://bqrail.substack.com/p/railcar-capacity-and-human-body-size)). Subways run underground, so they use no street space.
- Riders per bus, people per car, and car and bus lane space are simple assumptions (a 15 ft car plus a 5 ft gap, a 40 ft bus plus a 5 ft gap).
- Only CO2 from the trip itself is counted: tailpipe for cars and buses, power plants for rail.
