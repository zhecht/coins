
function get_profit_idx() {
	var cols = document.getElementsByClassName("coin_header_row")[0].getElementsByTagName("div");
	for (var i = 0; i < cols.length; ++i) {
		if (cols[i].innerText == "Profit") {
			return i;
		}
	}
}

function color() {
	var rows = document.getElementsByClassName("coin_row");
	var PROFIT_IDX = get_profit_idx();
	var tot_worth = 0, tot_profit = 0;

	for (var i = 0; i < rows.length - 1; ++i) {
		var cols = rows[i].getElementsByTagName("div");
		var profit = parseFloat(cols[PROFIT_IDX].innerText.replace("$", ""));
		tot_worth += parseFloat(cols[4].innerText.replace("$", ""));
		tot_profit += profit;
		if (profit >= 0) {
			cols[PROFIT_IDX].innerText = "+$"+profit;
			cols[PROFIT_IDX].className = "green";
		} else {
			cols[PROFIT_IDX].innerText = "-$"+profit*-1;
			cols[PROFIT_IDX].className = "red";
		}
		var perc_indexes = [PROFIT_IDX+1, PROFIT_IDX+2, PROFIT_IDX+3];
		for (var j = 0; j < perc_indexes.length; ++j) {
			var idx = perc_indexes[j];
			var val = parseFloat(cols[idx].innerText.slice(0, -1));
			if (val >= 0) {
				cols[idx].innerText = "+"+val+"%";
				cols[idx].className = "green";
			} else {
				cols[idx].innerText = "-"+val*-1+"%";
				cols[idx].className = "red";
			}	
		}
	}
	var tot_divs = document.getElementsByClassName("tot_row")[0].getElementsByTagName("div");
	tot_divs[4].innerText = "$"+tot_worth.toFixed(2);
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

//setInterval(refreshTable, 10000);