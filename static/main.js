
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

let multiples = document.getElementsByClassName("multiple");
for (m of multiples) {
	m.onclick = function() {
		m.innerHTML = "<input value='"+m.innerText+"' />"
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
			let amt = (data[coin]["amount"] * perc / 100).toFixed(2);
			let price = (amt*multiple*data[coin]["bought_at"]).toFixed(2);
			let left = (data[coin]["amount"] - amt).toFixed(2);
			let leftPrice = (left * data[coin]["bought_at"] * multiple).toFixed(2);
			document.getElementById(coin+"_multiple"+multiple+"_info").innerHTML = amt+" "+coin.toUpperCase()+" ($"+price+")<br>"+left+" left ($"+leftPrice+")";
		}
	}
}

let dataPoints = [];

function toggle(id, table=false) {
	let tables = document.getElementsByClassName("table");
	for (let i = 0; i < tables.length; ++i) {
		tables[i].style.display = "none";
	}
	let chart = document.getElementById(id);
	if (chart.style.display === "" || chart.style.display === "none") {
		if (table) {
			chart.style.display = "table";	
		} else {
			chart.style.display = "flex";
		}
	} else {
		chart.style.display = "none";
	}
}

function add_data(perc, coin) {
	dataPoints.push({"y": parseFloat(perc), "label": coin.toUpperCase()});
}

window.onload = function() {

	let chart = new CanvasJS.Chart("pie_chart", {
		animationEnabled: true,
		title: {
			//text: ""
		},
		data: [{
			type: "doughnut",
			//showInLegend: true,
			startAngle: 60,
			indexLabelFontSize: 18,
			yValueFormatString: "##0.00\"%\"",
			indexLabel: "{label} #percent%",
			toolTipContent: "<b>{label}:</b> {y} (#percent%)",
			dataPoints: dataPoints
		}]
	});
	chart.render();
}

//setInterval(refreshTable, 10000);