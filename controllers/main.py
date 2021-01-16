from flask import *

from bs4 import BeautifulSoup as BS
import json, hmac, hashlib, os, operator, time, re, requests, base64
from requests.auth import AuthBase

main = Blueprint('main', __name__, template_folder='views')

# Create custom authentication for Exchange
class CoinbaseExchangeAuth(AuthBase):
	def __init__(self, api_key, secret_key, passphrase):
		self.api_key = api_key
		self.secret_key = secret_key
		self.passphrase = passphrase

	def __call__(self, request):
		timestamp = str(time.time())
		message = timestamp + request.method + request.path_url + (request.body or '')
		hmac_key = base64.b64decode(self.secret_key)
		signature = hmac.new(hmac_key, message, hashlib.sha256)
		signature_b64 = signature.digest().encode('base64').rstrip('\n')

		request.headers.update({
			'CB-ACCESS-SIGN': signature_b64,
			'CB-ACCESS-TIMESTAMP': timestamp,
			'CB-ACCESS-KEY': self.api_key,
			'CB-ACCESS-PASSPHRASE': self.passphrase,
			'Content-Type': 'application/json'
		})
		return request

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
	profits_in_btc = 0
	profits_in_eth = 0
	for coin in coins:
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
				if row.get("soldTo") == "BTC":
					profits_in_btc += row['btc']*row["amt"]
					sold += round(row["btc"]*prices["bitcoin"]["price"]*row["amt"], 2)
					sold_txt += f"${sold} ({row['amt']} @ {row['btc']} BTC)"
				else:
					sold += round(row["amt"]*row["sold"], 2)
					# check this ??
					sold_txt += f"${sold} ({row['amt']} @ ${row['sold']})"
		if full_name in prices:
			price_data = prices[full_name]
			amt = coins[coin]["amt"]
			amt -= sold_amt
			if full_name == "bitcoin":
				amt += profits_in_btc
				amt = round(amt, 6)
			purchased = coins[coin]["bought"]
			worth = round(amt*price_data["price"], 2)
			# use sold if we want to subtract what we take out. 
			#profit = round(worth - purchased + sold, 2)
			profit = round(worth - purchased, 2)
			if coin == "btc":
				purchased = 0
				profit = round(profits_in_btc*prices["bitcoin"]["price"], 2)
			elif coin == "eth":
				purchased = 0
				profit = 0
			elif coin == "aave":
				purchased = 0
				profit = 0

			tot["tot_worth"] += worth
			tot["tot_profit"] += profit
			tot["tot_sold"] += sold
			tot["tot_purchased"] += purchased
			trends[coin]["btc_price"] = "{0:.8f}".format(round(price_data["price"] / prices["bitcoin"]["price"], 8))
			if coin not in ["btc", "eth", "aave"]:
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
			rows.append({"coin": coin, "sells": sells, "worth": worth, "sold": sold_txt, "profit": profit, "amount": amt, "purchased": purchased, "btc_price": trends[coin]["btc_price"], "price": round(price_data["price"], 2), "hour": round(price_data["percent_change_1h"], 2), "day": round(price_data["percent_change_24h"], 2), "week": round(price_data["percent_change_7d"], 2)})
	rows = sorted(rows, key=operator.itemgetter("worth"), reverse=True)
	for key in tot:
		tot[key] = round(tot[key], 2)
	return rows, tot, trends

@main.route('/refresh')
def refresh_route():
	rows, tot, trends = get_data()
	return jsonify(trends)

@main.route('/')
def main_route():
	rows, tot, _ = get_data()
	return render_template("main.html", rows=rows, tot=tot)