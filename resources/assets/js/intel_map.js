// ---------------------------------------------------------------

var queryURL = "/system?q=";

var timerUI = 0;

$(document).ready(function() {
	fixLegend();
	prepareTypeAhead();
	applyFilter();
});

// ---------------------------------------------------------------

function prepareTypeAhead() {

	var bloodsystem = new Bloodhound({
		datumTokenizer: Bloodhound.tokenizers.obj.whitespace('system'),
		queryTokenizer: Bloodhound.tokenizers.whitespace,
		remote: { url: queryURL + "%QUERY" }
	});

	bloodsystem.initialize();

	$('#system-search').typeahead(
	{
		hint: false,
		highlight: false,
		minLength: 3
	},
	{
		name: 'systems',
		displayKey: 'system',
		source: bloodsystem.ttAdapter(),
		templates: {
			suggestion: Handlebars.compile('<p class="text-right"><strong>{{system}}</strong> <small>({{region}})</small></p>')
		}
	}
	).on('typeahead:selected', function(obj, val) {
		var system = val['system'];
		var region = val['region'].replace(/\ /g, '_');
		drawLoad(region, system);
	});
}

function systemLucky(value) {
	if (value.length < 3) { return; }

	$.ajax({
	async: true,
		url: queryURL + value,
	mimeType: "application/json",
	dataType: 'json',
	success: function (response) {
		if (response.length == 0) { return; }
		$('#system-search').val(response[0]['system']);
		drawLoad(response[0]['region'].replace(/\ /g, '_'), response[0]['system']);
	},
	});
}

// ---------------------------------------------------------------

function queueUIRefresh() {
	if (timerUI != 0) {
		clearTimeout(timerUI); }

	timerUI = setTimeout(function() { applyUI(); }, 10000);
}

function applyFilter() {
	logsFilterRefresh();
	applyData(false);
}

function applyData(sound) {
	logsRefresh(sound);
	applyUI();
}

function applyUI() {
	queueUIRefresh();
	logsRefreshTimestamps();
	drawMap();
}

// ---------------------------------------------------------------

function mapSystemClicked(name) {
	if ($.inArray(name, logsFilterSystems) != -1) {
		logsFilterSystemRemove(name);
		applyFilter();
		return; }

	switch (settingsGet('s-map-action-select-filter')) {
		case '0':
			logsFilterSystemAdd(name);
			break;
		case '1':
			logsFilterSystemReplace(name);
			break; }

	switch (settingsGet('s-map-action-select-unknown')) {
		case '0':
			break;
		case '1':
			logsFilterUnknownsSet(false);
			break;
		case '2':
			logsFilterUnknownsSet(true);
			break; }

	applyFilter();
}

function logsSystemsClicked(names) {
	switch (settingsGet('s-logs-action-select-filter')) {
		case '0':
			logsFilterSystemsAdd(names);
			break;
		case '1':
			logsFilterSystemsReplace(names);
			break; }

	switch (settingsGet('s-logs-action-select-unknown')) {
		case '0':
			break;
		case '1':
			logsFilterUnknownsSet(false);
			break;
		case '2':
			logsFilterUnknownsSet(true);
			break; }

	applyFilter();
}

// ---------------------------------------------------------------

function timestampToAgo(timestamp) {
	var diff = (new Date().getTime() - timestamp) / 1000 / 60;
	if (diff < 0.5) {
		return 'new'; }
	return Math.ceil(diff) + 'm';
}

// ---------------------------------------------------------------

function timestampToColor(timestamp) {
	var diff = Math.ceil((new Date().getTime() - timestamp) / 1000 / 60);
	if (diff < 2) {
		return "#ff0000"; }
	if (diff < 5) {
		return "#ff6d00"; }
	if (diff < 10) {
		return "#efef00"; }
	if (diff < 15) {
		return "#b8a62e"; }
	if (diff < 20) {
		return "#615718"; }
	return false;
}

function connectionToColor(gate) {
	if (gate == "j") {
		return "#4c4c4c"; }
	if (gate == "jc") {
		return "#7c0000"; }
	if (gate == "jr") {
		return "#7c047b"; }
	if (gate == "jb") {
		return "#000000"; }
	if (gate == "jbf") {
		return "#0b0bbc"; }
	if (gate == "jbh") {
		return "#47270a"; }
}

function systemToColor() {
	return "#6d6d6d";
}

function nameToColor() {
	return "#aaaaaa";
}

function fixLegend() {
	$("#legend-less2").css('color', timestampToColor(new Date().getTime() - (1000 * 60 * 1)));
	$("#legend-less5").css('color', timestampToColor(new Date().getTime() - (1000 * 60 * 4)));
	$("#legend-less10").css('color', timestampToColor(new Date().getTime() - (1000 * 60 * 9)));
	$("#legend-less15").css('color', timestampToColor(new Date().getTime() - (1000 * 60 * 14)));
	$("#legend-less20").css('color', timestampToColor(new Date().getTime() - (1000 * 60 * 19)));

	$("#legend-j").css('color', connectionToColor('j'));
	$("#legend-jc").css('color', connectionToColor('jc'));
	$("#legend-jr").css('color', connectionToColor('jr'));
	$("#legend-jbf").css('color', connectionToColor('jbf'));
	$("#legend-jbh").css('color', connectionToColor('jbh'));

	$("#legend-system").css('color', systemToColor());
	$("#legend-system-station").css('color', systemToColor());
}

// ---------------------------------------------------------------

function blink(id) {
	h = 400;
	l = 600;
	$('#' + id)
	.animate({opacity: 1}, 400)
	.animate({opacity: 0.2}, 600)
	.animate({opacity: 1}, 400)
	.animate({opacity: 0.2}, 600)
	.animate({opacity: 1}, 400)
	.animate({opacity: 0.2}, 600)
	.animate({opacity: 1}, 400)
	.animate({opacity: 0}, 600);
}

// ---------------------------------------------------------------

function findSystem(sid) {
	for (i in drawData['map']['systems']) {
			if (drawData['map']['systems'][i]['id'] == sid) {
				return drawData['map']['systems'][i]; } }
	return false;
}

function findBridge(jid) {
	for (i in jbData['bridges']) {
		if (jbData['bridges'][i]['idA'] == jid || jbData['bridges'][i]['idB'] == jid) {
			return jbData['bridges'][i]; } }
	return false;
}

// ---------------------------------------------------------------

function showSystemDetails(obj, sid) {
	hideSystemDetails(sid);

	sys = findSystem(sid);
	if (sys === false) { return; }

	$('#popsys-name').html('<span>' + sys['name'] + '</span>');

	cnt = "";
	cnt+= '<div class="text-muted">';

	bridge = findBridge(sid);
	if (bridge !== false) {
		cnt += '<b>Jumpbridge</b> ';
		if (bridge['friendly'] == true) {
			cnt += ' (friendly)'; }

		else {
			cnt += ' (<span style="color: ' + connectionToColor('jbh') + ';">hostile</span>)'; }

		cnt+= '<br>';
		cnt += "&nbsp;&nbsp;";
		cnt += bridge['nameA'] + " " + bridge['planetA'] + "-" + bridge['moonA'];
		cnt += ' &lt;-&gt; ';
		cnt += bridge['nameB'] + " " + bridge['planetB'] + "-" + bridge['moonB'] + "<br>"; }

	jumps = 0;
	if (eveData['jumps'] !== undefined) {
		if (eveData['jumps'][sid] !== undefined) {
			jumps = eveData['jumps'][sid]; } }

	cnt += '<b>Stats</b> (1h)<br>';
	cnt += "&nbsp;&nbsp;" + jumps + " jumps<br>";

	kShips = 0;
	kPods = 0;
	kRats = 0;
	if (eveData['kills'] !== undefined) {
		if (eveData['kills'][sid] !== undefined) {
			kShips = eveData['kills'][sid]['ships'];
			kPods = eveData['kills'][sid]['pods'];
			kRats = eveData['kills'][sid]['rats']; } }

	cnt += '<b>Kills</b> (1h)<br>';
	cnt += "&nbsp;&nbsp;" + kShips + " ships<br>";
	cnt += "&nbsp;&nbsp;" + kPods + " pods<br>";
	cnt += "&nbsp;&nbsp;" + kRats + " rats<br>";
	cnt += '</span>';

	$('#popsys-content').html(cnt);
	popShow(obj, "#popsys");
}

function hideSystemDetails(obj, sid) {
	popHide(obj, "#popsys");
}

// ---------------------------------------------------------------

function popHide(obj, overlay) {
	$("#popsys").addClass('hide');
}

function popShow(obj, overlay) {
  $(overlay).css({left: 0, top: 0, position:'absolute'});
  $(overlay).removeClass('hide');

  var ox = 25;
  var oy = 0;

  var x = $(obj).offset().left;
  var y = $(obj).offset().top;

  if (x + ox + $(overlay).width() > $(document).width()) {
	x = (x - ox - $(overlay).width()); }

  else {
	x = (x + ox); }

  if (y + oy + $(overlay).height() > $(document).height()) {
	y = (y - oy - $(overlay).height()); }

  else {
	y = (y + oy); }

 $(overlay).css({left: x, top: y, position:'absolute'});
}

// ---------------------------------------------------------------
