import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import dayjs from "dayjs";
import Tabs from "@geist-ui/core/esm/tabs/tabs.js";
// create a type for the data in the file btc_data.json (see below) and import it
//import BtcData from "./btc_data.js";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
} from "recharts";
//import BtcData from "./eth_data.js";
import BtcData from "./btc_data.js";

// function to get the percentage of a number
const getPercentage = (num: number, per: number) => {
  return (num / 100) * per;
};

// const priceData = BtcData.filter((data: any) => {
//   const year = dayjs(data.Date).year();
//   return year === 2022 || year === 2023;
// });
const priceData = BtcData;

const startBtc = 10;
const results: any = [];
const bumpPerc = 99;
const termLength = 7;
// Premium apr
const premiumApr = 0.2;

// TODO: incorporate slippage into re-buy
const slippagePerc = 0.005;

const actions = {
  CLAIM: "claim rebuy and create bump",
  OPEN: "open new bump",
  REBUMP: "cancel and reopen bump",
  NONE: "no action",
};

function greatestOf(first, second) {
  return first > second ? first : second;
}

// seed the results array with the first value
results.push({
  qtyBtc: startBtc,
  dollarVal: startBtc * priceData[0].Open,
  bumpFloor: getPercentage(priceData[0].Open, bumpPerc),
  termStartPrice: priceData[0].Open,
  termEnd: dayjs(priceData[0].Date).add(termLength, "day").format("YYYY-MM-DD"),
  action: actions.OPEN,
  // fields from data
  date: priceData[0].Date,
  open: priceData[0].Open,
  high: priceData[0].High,
  low: priceData[0].Low,
  close: priceData[0].Close,
});

for (let i = 1; i < priceData.length; i++) {
  const prev: any = results[i - 1];
  const curr = priceData[i];
  const dailyPremium = (prev.qtyBtc * premiumApr) / 365;
  const netQtyBtc = prev.qtyBtc - dailyPremium;
  const newBumpThresh = getPercentage(prev.termStartPrice, 1);
  if (curr.Date === prev.termEnd) {
    if (curr.Close < prev.bumpFloor) {
      const dollars = netQtyBtc * prev.bumpFloor;
      const dollarsStr = `netqtyBtc: ${netQtyBtc} * prev.bumpFloor: ${prev.bumpFloor}`;
      const newQty = (dollars - dollars * slippagePerc) / curr.Close;
      const newQtyStr = `dollars: ${dollars} - (${
        dollars * slippagePerc
      })/ curr.Close: ${curr.Close}`;
      // claim rebuy and create new bump
      results.push({
        qtyBtc: newQty,
        //dollarVal: newQty * curr.Close,
        dollarVal: newQty * curr.Close,
        prevQtyBtc: prev.qtyBtc,
        bumpFloor: getPercentage(curr.Close, bumpPerc),
        termStartPrice: curr.Close,
        termEnd: dayjs(curr.Date).add(termLength, "day").format("YYYY-MM-DD"),
        action: actions.CLAIM,
        // fields from data
        date: curr.Date,
        open: curr.Open,
        high: curr.High,
        low: curr.Low,
        close: curr.Close,
        dailyPremium,
        dollars,
        dollarsStr,
        newQtyStr,
      });
    } else {
      // create new bump
      results.push({
        qtyBtc: netQtyBtc,
        dollarVal: netQtyBtc * curr.Close,
        prevQtyBtc: prev.qtyBtc,
        bumpFloor: getPercentage(curr.Close, bumpPerc),
        termStartPrice: curr.Close,
        termEnd: dayjs(curr.Date).add(termLength, "day").format("YYYY-MM-DD"),
        action: actions.OPEN,
        // fields from data
        date: curr.Date,
        open: curr.Open,
        high: curr.High,
        low: curr.Low,
        close: curr.Close,
        dailyPremium,
      });
    }
  } else if (curr.Close >= prev.termStartPrice + newBumpThresh) {
    // cancel and reopen bump
    results.push({
      qtyBtc: netQtyBtc,
      dollarVal: netQtyBtc * curr.Close,
      prevQtyBtc: prev.qtyBtc,
      bumpFloor: getPercentage(curr.Close, bumpPerc),
      termStartPrice: curr.Close,
      termEnd: dayjs(curr.Date).add(termLength, "day").format("YYYY-MM-DD"),
      action: actions.REBUMP,
      // fields from data
      date: curr.Date,
      open: curr.Open,
      high: curr.High,
      low: curr.Low,
      close: curr.Close,
      dailyPremium,
    });
  } else {
    // no action
    results.push({
      qtyBtc: netQtyBtc,
      dollarVal: netQtyBtc * greatestOf(curr.Close, prev.bumpFloor),
      prevQtyBtc: prev.qtyBtc,
      bumpFloor: prev.bumpFloor,
      termStartPrice: prev.termStartPrice,
      termEnd: prev.termEnd,
      action: actions.NONE,
      // fields from data
      date: curr.Date,
      open: curr.Open,
      high: curr.High,
      low: curr.Low,
      close: curr.Close,
      dailyPremium,
    });
  }
}

const getActionCountByYear = () => {
  const years: any = {
    "2020": {},
    "2021": {},
    "2022": {},
    "2023": {},
    "2024": {},
  };
  results.forEach((data: any) => {
    const year = dayjs(data.date).year();
    if (!years[year][data.action]) {
      years[year][data.action] = 0;
    }
    years[year][data.action]++;
  });
  return years;
};
//console.log("action count by year", getActionCountByYear());

function getNoActionStreaks() {
  const streaks: any = [];
  let streak = 0;
  results.forEach((data: any) => {
    if (data.action === actions.NONE) {
      streak++;
    } else {
      streaks.push(streak);
      streak = 0;
    }
  });
  // get the average streak
  const sum = streaks.reduce((a: number, b: number) => a + b, 0);
  const avg = sum / streaks.length || 0;
  // get the count of streaks = 6
  const count = streaks.filter((s: number) => s === 6).length;
  const retVal = { streaks, avg, countSix: count };
  console.log("no action streaks", retVal);
  return retVal;
}
//getNoActionStreaks();

const getRowStyle = (result: any) => {
  const year = dayjs(result.date).year();
  switch (year) {
    case 2014:
      return { backgroundColor: "lightblue" };
    case 2015:
      return { backgroundColor: "lightgreen" };
    case 2016:
      return { backgroundColor: "lightyellow" };
    case 2017:
      return { backgroundColor: "lightpink" };
    case 2018:
      return { backgroundColor: "lightgray" };
    case 2019:
      return { backgroundColor: "lightcyan" };
    case 2020:
      return { backgroundColor: "lightcoral" };
    case 2021:
      return { backgroundColor: "lightseagreen" };
    case 2022:
      return { backgroundColor: "lightsalmon" };
    case 2023:
      return { backgroundColor: "lightsteelblue" };
    case 2024:
      return { backgroundColor: "lightskyblue" };
    default:
      return { backgroundColor: "white" };
  }
};

function App() {
  const [actionFilter, setActionFilter] = useState("");

  return (
    <>
      <Tabs initialValue="1">
        <Tabs.Item key="1" label="Table" value="1">
          <div>
            Action:
            <select onChange={(e) => setActionFilter(e.target.value)}>
              <option value="">All</option>
              <option value={actions.CLAIM}>{actions.CLAIM}</option>
              <option value={actions.OPEN}>{actions.OPEN}</option>
              <option value={actions.REBUMP}>{actions.REBUMP}</option>
              <option value={actions.NONE}>{actions.NONE}</option>
            </select>
            <div>{`bumpPerc: ${bumpPerc}, termLen: ${termLength}, premiumApr: ${
              premiumApr * 100
            }%, slippagePerc: ${slippagePerc * 100}%`}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Row</th>
                <th>Date</th>
                <th>Qty BTC</th>
                <th>Dollar Val</th>
                <th>Bump Floor</th>
                <th>Term Start Price</th>
                <th>Term End</th>
                <th>Action</th>
                <th>Open</th>
                <th>High</th>
                <th>Low</th>
                <th>Close</th>
              </tr>
            </thead>
            <tbody>
              {results
                .filter((result: any) => {
                  if (actionFilter === "") {
                    return true;
                  } else {
                    return result.action === actionFilter;
                  }
                })
                .map((result: any, index: number) => (
                  <tr key={index} style={getRowStyle(result)}>
                    <td>
                      <input
                        type="button"
                        value={index}
                        onClick={() => {
                          console.log("index", index, result);
                        }}
                      />
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{result.date}</td>
                    <td>{result.qtyBtc}</td>
                    <td>
                      {new Intl.NumberFormat().format(
                        result.dollarVal.toFixed(2)
                      )}
                    </td>
                    <td>{result.bumpFloor.toFixed(2)}</td>
                    <td>{result.termStartPrice.toFixed(2)}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{result.termEnd}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{result.action}</td>
                    <td>{result.open.toFixed(2)}</td>
                    <td>{result.high.toFixed(2)}</td>
                    <td>{result.low.toFixed(2)}</td>
                    <td>{result.close.toFixed(2)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Tabs.Item>
        <Tabs.Item key="2" label="Chart">
          <LineChart
            width={1400}
            height={300}
            data={results}
            // margin={{
            //   top: 5,
            //   right: 30,
            //   left: 20,
            //   bottom: 5,
            // }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="dollarVal"
              stroke="#8884d8"
              activeDot={{ r: 8 }}
            />
            <Brush />
          </LineChart>
        </Tabs.Item>
      </Tabs>
    </>
  );
}

export default App;
