from flask import *

from bs4 import BeautifulSoup as BS
import json, hmac, hashlib, os, operator, time, re, requests, base64
from requests.auth import AuthBase

main = Blueprint('main', __name__, template_folder='views')

def getExchanges(tickers):
	exchanges = {}
	for ticker in tickers["tickers"]:
		if ticker["target"] not in exchanges:
			exchanges[ticker["target"]] = []
		exchanges[ticker["target"]].append(ticker["market"]["name"])
	for target in exchanges:
		exchanges[target] = ",".join(exchanges[target])
	return exchanges

def makeSlider(data):
	for multiple, default_perc in [(2, 10), (5, 25)]:
		amt = round(data["amount"] * default_perc / 100, 2)
		left = round(data["amount"] - amt, 2)
		price = round(amt * data["bought_at"] * multiple, 2)
		left_price = round(left * data["bought_at"] * multiple, 2)
		html = f"""
		<span id='{data['coin']}_multiple{multiple}_info'>
			{amt} {data['coin'].upper()} (${price})
			<br>{left} left (${left_price}) 
		</span>"""
		data[f"multiple{multiple}"] = html

def get_data():
	with open("static/coins.json") as fh:
		coins = json.load(fh)

	with open("static/sell.json") as fh:
		sold_coins = json.load(fh)

	coin_ids = ",".join([coin for coin in coins])
	url = "https://web-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=1&limit=4185&sort=market_cap&sort_dir=desc&convert=USD&cryptocurrency_type=all"
	# update prices
	if 0 and os.path.exists("static/listings.json"):
		with open("static/listings.json") as fh:
			listings = json.load(fh)
	else:
		with open("static/listings.json", "w") as fh:
			listings = requests.get(url).json()
			json.dump(listings, fh, indent=4)

	prices = {}
	for coin in listings["data"]:
		prices[coin["name"].lower()] = coin["quote"]["USD"]

	rows = []
	tot = {
		"tot_worth": 0,
		"tot_profit": 0,
		"tot_sold": 0,
		"tot_purchased": 0
	}
	trends = {}
	portfolio = []
	profits_in_btc = 0
	profits_in_dai = 0
	profits_in_eth = 0
	fees_in_eth = 0
	for coin in coins:
		if "fee" in coins[coin]:
			fees_in_eth += coins[coin]["fee"]
		if coin in sold_coins:
			sold_data = sold_coins[coin]
			for row in sold_data:
				if row.get("soldTo") == "btc":
					profits_in_btc += row['btc']*row["amt"]
				elif row.get("soldTo") == "dai":
					profits_in_dai += row["dai"]
				elif row.get("soldTo") == "eth":
					profits_in_eth += row["eth"]
	for coin in coins:
		with open(f"static/markets/{coin}.json") as fh:
			tickers = json.load(fh)
		exchanges = getExchanges(tickers)
		trends[coin] = {}
		full_name = coins[coin]["full"]
		sold = 0
		sold_amt = 0
		sold_txt = ""
		sells = ""
		if coin in sold_coins:
			sold_data = sold_coins[coin]
			for row in sold_data:
				sold_amt += row["amt"]
				if row.get("soldTo") == "btc":
					sold += round(row["btc"]*prices["bitcoin"]["price"]*row["amt"], 2)
					sold_txt += f"${sold} ({row['amt']} @ {row['btc']} BTC)"
					sold_txt = f"${round(sold, 2)} BTC"
				elif row.get("soldTo") == "dai":
					sold_ = round(row["dai"]*prices["dai"]["price"], 2)
					sold += sold_
					#sold_txt += f"${sold_} ({row['amt']}/{row['dai']}DAI)"
					#sold_txt = f"${sold} ({sold_amt}/{row['dai']} DAI)"
					sold_txt = f"${round(sold, 2)} DAI"
				elif row.get("soldTo") == "eth":
					sold += round(row["eth"]*prices["ethereum"]["price"], 2)
					sold_txt = f"${sold} ETH"
				else:
					sold += round(row["amt"]*row["sold"], 2)
					# check this ??
					sold_txt += f"${sold} ({row['amt']} @ ${row['sold']})"
					sold_txt = f"${sold} USD"
		if full_name in prices:
			price_data = prices[full_name]
			amt = coins[coin]["amt"]
			amt -= sold_amt
			if coin == "btc":
				amt += profits_in_btc
				amt = round(amt, 6)
			elif coin == "eth":
				#amt -= fees_in_eth
				pass
				#amt += profits_in_eth
				#amt = round(amt, 2)
			elif coin == "dai":
				amt = round(amt+profits_in_dai, 2)
			purchased = coins[coin]["bought"]

			worth = round(amt*price_data["price"], 2)
			bought_at = round(purchased / coins[coin]["amt"], 3)
			diff = 0
			if bought_at:
				#diff = round((price_data["price"] - bought_at) / bought_at * 100, 2)
				diff = round(price_data["price"] / bought_at, 2)
				if bought_at > price_data["price"]:
					diff *= -1
			# use sold if we want to subtract what we take out. 
			profit = round(worth - purchased + sold, 2)
			#profit = round(worth - purchased, 2)
			#if coin == "btc":
			#	purchased = 0
				#profit = round(profits_in_btc*prices["bitcoin"]["price"], 2)
			#elif coin == "dai":
				#purchased = 0
				#profit = round(profits_in_dai*prices["dai"]["price"], 2)
			if coin in ["btc", "eth", "dai", "eth", "aave"]:
				purchased = 0
				profit = 0

			tot["tot_worth"] += worth
			tot["tot_profit"] += profit
			tot["tot_sold"] += sold
			tot["tot_purchased"] += purchased
			trends[coin]["btc_price"] = "{0:.8f}".format(round(price_data["price"] / prices["bitcoin"]["price"], 8))
			if coin not in ["btc", "eth", "aave", "dai"]:
				for i in range(2, 3, 1):
					new_purch = i*(purchased / coins[coin]["amt"])
					#print(coin, i, purchased, sold)
					new_amt = purchased - sold
					breakeven = int(new_amt / new_purch)
					tot_amt = int(new_purch * breakeven)
					new_purch = round(new_purch, 2)
					sells += f"{breakeven} {coin.upper()} @ ${new_purch} (${tot_amt})"
			
			trends[coin]["price"] = round(price_data["price"], 2)
			trends[coin]["worth"] = round(worth, 2)
			trends[coin]["profit"] = round(profit, 2)
			trends[coin]["hour"] = round(price_data["percent_change_1h"], 2)
			trends[coin]["day"] = round(price_data["percent_change_24h"], 2)
			trends[coin]["week"] = round(price_data["percent_change_7d"], 2)
			coinType = coins[coin]["type"].split(",")[0] if "type" in coins[coin] else ""
			data = {"coin": coin, "type": coinType, "sells": sells, "diff": diff, "worth": worth, "sold": sold_txt, "profit": profit, "amount": amt, "totAmount": coins[coin]["amt"], "purchased": purchased, "bought_at": bought_at, "btc_price": trends[coin]["btc_price"], "price": round(price_data["price"], 3), "hour": round(price_data["percent_change_1h"], 2), "day": round(price_data["percent_change_24h"], 2), "week": round(price_data["percent_change_7d"], 2), "exchanges": exchanges}
			makeSlider(data)
			rows.append(data)
	rows = sorted(rows, key=operator.itemgetter("worth"), reverse=True)
	for row in rows:
		row["perc"] = round(row["worth"] / tot["tot_worth"] * 100, 2)
	for key in tot:
		tot[key] = round(tot[key], 2)
	return rows, tot, trends

@main.route('/refresh')
def refresh_route():
	rows, tot, trends = get_data()
	return jsonify(trends)

@main.route('/markets')
def markets_route():
	with open("static/coins.json") as fh:
		coins = json.load(fh)

	coin_ids = ",".join([coin for coin in coins])
	for coin in coins:
		if coin != "rook":
			continue
		gecko_id = coins[coin]["gecko"] if "gecko" in coins[coin] else coins[coin]["full"]
		url = f"https://api.coingecko.com/api/v3/coins/{gecko_id}?market_data=false&community_data=false&developer_data=false"
		with open(f"static/markets/{coin}.json", "w") as fh:
			json.dump(requests.get(url).json(), fh, indent=4)
	return jsonify({"success": 1})

def getDrop(which):
	multiple = 2
	val = 10
	if which == "second":
		multiple = 5
		val = 25
	html = f"<div class='multiple'><span>{multiple}x</span></div><input id='{multiple}x' class='slider' type='range' step='5' min='0' max='100' value='{val}'/><label class='slider_label'>{val}%</label>"
	html += "<div class='multiple_change'>"
	for i in [2,3,5,6,9,10,12,15,20]:
		html += f"<div>{i}x</div>"
	html += "</div>"
	return html


@main.route('/')
def main_route():
	rows, tot, _ = get_data()
	data = {}
	for row in rows:
		data[row["coin"]] = row
	return render_template("main.html", rows=rows, tot=tot, data=data, firstDrop=getDrop("first"), secondDrop=getDrop("second"))