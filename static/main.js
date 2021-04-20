
function get_diff_idx(class_) {
	let header_row = class_ === "exit_row" ? "exit_header_row" : "coin_header_row";
	var cols = document.getElementsByClassName(header_row)[0].getElementsByTagName("div");
	for (var i = 0; i < cols.length; ++i) {
		if (cols[i].innerText == "Diff") {
			return i;
		}
	}
}
function get_profit_idx(class_) {
	let header_row = class_ === "exit_row" ? "exit_header_row" : "coin_header_row";
	var cols = document.getElementsByClassName(header_row)[0].getElementsByTagName("div");
	for (var i = 0; i < cols.length; ++i) {
		if (cols[i].innerText == "Profit") {
			return i;
		}
	}
}

function get_worth_idx(class_) {
	let header_row = class_ === "exit_row" ? "exit_header_row" : "coin_header_row";
	var cols = document.getElementsByClassName(header_row)[0].getElementsByTagName("div");
	for (var i = 0; i < cols.length; ++i) {
		if (cols[i].innerText == "Worth") {
			return i;
		}
	}
}

function color(class_="coin_row") {
	var rows = document.getElementsByClassName(class_);
	var PROFIT_IDX = get_profit_idx(class_);
	var WORTH_IDX = get_worth_idx(class_);
	let DIFF_IDX = get_diff_idx(class_);
	var tot_worth = 0, tot_profit = 0;

	// don't loop over total row
	let tot_rows = rows.length;
	if (class_ === "coin_row") {
		tot_rows = rows.length - 1;
	}

	for (var i = 0; i < tot_rows; ++i) {
		var cols = rows[i].getElementsByTagName("div");
		var profit = parseFloat(cols[PROFIT_IDX].innerText.replace("$", ""));
		tot_worth += parseFloat(cols[WORTH_IDX].innerText.replace("$", ""));
		tot_profit += profit;
		if (profit >= 0) {
			cols[PROFIT_IDX].innerText = "+$"+profit;
			cols[PROFIT_IDX].className = "green";
		} else {
			cols[PROFIT_IDX].innerText = "-$"+profit*-1;
			cols[PROFIT_IDX].className = "red";
		}
		let perc_indexes = [DIFF_IDX, PROFIT_IDX+1, PROFIT_IDX+2, PROFIT_IDX+3];
		if (class_ === "exit_row") {
			perc_indexes = [DIFF_IDX];
		}
		for (var j = 0; j < perc_indexes.length; ++j) {
			var idx = perc_indexes[j];
			let char = cols[idx].innerText.slice(-1);
			var val = parseFloat(cols[idx].innerText.replace(char, ""));
			if (val >= 0) {
				cols[idx].innerText = "+"+val+char;
				cols[idx].className = "green";
			} else {
				cols[idx].innerText = "-"+val*-1+char;
				cols[idx].className = "red";
			}	
		}
	}
	let tot_idx = 0;
	if (class_ === "coin_row") {
		tot_idx = 1;
	}
	var tot_divs = document.getElementsByClassName("tot_row")[tot_idx].getElementsByTagName("div");
	tot_divs[WORTH_IDX].innerText = "$"+tot_worth.toFixed(2);
	tot_divs[PROFIT_IDX].innerText = "$"+tot_profit.toFixed(2);
	if (tot_profit >= 0) {
		tot_divs[PROFIT_IDX].className = "green";
	} else {
		tot_divs[PROFIT_IDX].className = "red";
	}
}

function updateTrends(trends) {
	var rows = document.getElementsByClassName("coin_row");
	for (var i = 0; i < rows.length - 1; ++i) {
		var divs = rows[i].getElementsByTagName("div");
		var coin = divs[0].innerText.toLowerCase();
		divs[2].innerText = "$"+trends[coin]["price"];
		divs[3].innerText = trends[coin]["btc_price"];
		divs[4].innerText = "$"+trends[coin]["worth"];
		divs[divs.length - 1].innerText = trends[coin]["week"]+"%";
		divs[divs.length - 2].innerText = trends[coin]["day"]+"%";
		divs[divs.length - 3].innerText = trends[coin]["hour"]+"%";
	}
	color(class_="exit_row");
	color();
}

function refreshTable() {
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if (this.readyState === 4 && this.status === 200) {
			var j = JSON.parse(this.responseText);
			updateTrends(j);
		}
	};
	xhttp.open("GET", "/refresh");
	xhttp.send();
}

let exit_coins = document.getElementsByClassName("exit_coin");
for (let coin of exit_coins) {
	coin.onclick = function() {
		let coinName = this.innerText.toLowerCase();
		let totAmt = coinData[coinName]["totAmount"];
		let html = "<div class='header_row'><div colspan='3'>"+coinName.toUpperCase()+" "+totAmt+" ($"+coinData[coinName]["purchased"]+")</div></div>";
		let strats = [[2, 10], [3, 23], [6, 30]];
		for (let i = 0; i < strats.length; ++i) {
			let mult = strats[i][0];
			let perc = strats[i][1];
			let newPrice = mult*coinData[coinName]["bought_at"];
			let amt = totAmt * (perc / 100);
			let fixed = coinName == "btc" ? 6 : 2;
			let left = totAmt - amt;
			html += "<div class='row'><div>"+perc+"% @ "+mult+"x</div>"
			html += "<div>"+amt.toFixed(fixed)+" @ "+newPrice.toFixed(2)+" = $"+(newPrice*amt).toFixed(2)+"</div>"
			html += "<div>"+left.toFixed(fixed)+" left = $"+(newPrice*left).toFixed(2)+"</div>"
			html += "</div>";

			totAmt -= amt;
		}
		let b = document.getElementById("breakdown");
		b.style.display = "table";
		b.innerHTML = html;
	}
}

let multiples = document.getElementsByClassName("multiple");
let showingInput = false;
for (m of multiples) {
	m.onclick = function() {
		console.log(this.parentNode);
		this.parentNode.getElementsByClassName("multiple_change")[0].display = "flex";
	}
}

let sliders = document.getElementsByClassName("slider");
for (let i = 0; i < sliders.length; ++i) {
	sliders[i].onchange = function() {
		this.nextSibling.innerText = this.value+"%";
		let rows = document.getElementsByClassName("exit_row");
		let perc = this.value;
		let idx = rows.length - 1;
		if (this.id == "2x") idx--;
		for (var i = 0; i < rows.length; ++i) {
			let cols = rows[i].getElementsByTagName("div");
			let coin = cols[0].innerText.toLowerCase();
			let multiple = parseInt(this.id[0]);
			let amt = (coinData[coin]["amount"] * perc / 100).toFixed(2);
			let price = (amt*multiple*coinData[coin]["bought_at"]).toFixed(2);
			let left = (coinData[coin]["amount"] - amt).toFixed(2);
			let leftPrice = (left * coinData[coin]["bought_at"] * multiple).toFixed(2);
			document.getElementById(coin+"_multiple"+multiple+"_info").innerHTML = amt+" "+coin.toUpperCase()+" ($"+price+")<br>"+left+" left ($"+leftPrice+")";
		}
	}
}

let dataPoints = [];
let typeData = {};

function toggle(id, table=false) {
	let tables = document.getElementsByClassName("table");
	for (let i = 0; i < tables.length; ++i) {
		tables[i].style.display = "none";
	}
	let charts = document.getElementsByClassName("chart");
	for (let i = 0; i < charts.length; ++i) {
		charts[i].style.display = "none";
	}
	let chart = document.getElementById(id);
	if (chart.style.display === "" || chart.style.display === "none") {
		if (table) {
			chart.style.display = "table";
		} else {
			chart.style.display = "flex";
			if (id == "pie_chart") {
				document.getElementById("type_chart").style.display = "flex";
			}
		}
	} else {
		chart.style.display = "none";
	}
}

function getType(coinType) {
	return coinType;
	if (["insurance", "lending", "dex", "derivative", "assets", "oracle", "amm", "farm"].indexOf(coinType) >= 0) {
		return "DeFi";
	}
	return coinType;
}

function add_data(perc, coin, worth, coinType) {
	dataPoints.push({"y": parseFloat(perc), "label": coin.toUpperCase(), "worth": worth});

	coinType = getType(coinType);
	if (!(coinType in typeData)) {
		typeData[coinType] = {
			"coins": [],
			"worth": 0,
			"alt_worth": 0
		};
	}
	typeData[coinType]["coins"].push(coin);
	typeData[coinType]["worth"] += coinData[coin]["worth"]
	if (["eth", "btc"].indexOf(coin) < 0) {
		typeData[coinType]["alt_worth"] += coinData[coin]["worth"];
	}
}

window.onload = function() {

	let chart = new CanvasJS.Chart("pie_chart", {
		width: 1000,
		height: 500,
		animationEnabled: true,
		title: {
			//text: ""
		},
		data: [{
			type: "doughnut",
			//showInLegend: true,
			//startAngle: 60,
			//indexLabelFontSize: 18,
			yValueFormatString: "##0.0\"%\"",
			indexLabel: "{label} #percent%",
			toolTipContent: "<b>{label}:</b> {y} (${worth})",
			dataPoints: dataPoints
		}]
	});
	let d = [];
	let tot_worth = 0, tot_alt_worth = 0;
	for (let type in typeData) {
		tot_worth += typeData[type]["worth"];
		tot_alt_worth += typeData[type]["alt_worth"];
	}
	for (let type in typeData) {
		d.push({
			"type": type,
			"y": parseFloat((typeData[type]["alt_worth"] / tot_alt_worth * 100).toFixed(2)), "coinStr": typeData[type]["coins"].join(",")
		});
	}
	let chart2 = new CanvasJS.Chart("type_chart", {
		width: 1000,
		height: 500,
		animationEnabled: true,
		title: {
			//text: ""
		},
		data: [{
			type: "doughnut",
			//showInLegend: true,
			//startAngle: 60,
			//indexLabelFontSize: 18,
			yValueFormatString: "##0.0\"%\"",
			indexLabel: "{type} #percent%",
			toolTipContent: "<b>{type}:</b> {y} {coinStr}",
			dataPoints: d
		}]
	});
	//chart.render();
	chart2.render();
}

setTimeout(function() {
	window.location.reload()
}, 50000);
//setInterval(refreshTable, 10000);