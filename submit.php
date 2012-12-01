<?
//Globals cause I'm a terrible person


function submit_sql($sql) { 

	$submit_url = "http://sanhack.cartodb.com/api/v2/sql?q=";
	$apikey = file_get_contents("apikey.txt");
	$api_connect = "&api_key=$apikey";
	$full_url = $submit_url . urlencode($sql) . $api_connect;
	$json = system("curl \"" . $full_url . "\"");
	return json_decode($json);
}

function log_raw_message() {
	$number = $_GET['num'];
	$message = $_GET['msg'];

	$raw_msg_insert_sql = "INSERT INTO message_logs (message, phone) VALUES ( '$number', '$message' )";
	$values = submit_sql($raw_msg_insert_sql); 
	
	if ($values->total_rows != 1) {
		print "more than expected number of rows\n <br />";
	}
}

//Returns true if we already know the sender
function known_phone() {
	$number = $_GET['num'];
	$raw_sql = "SELECT * FROM phone_registration WHERE phone = '$number'";
	print $raw_sql . "\n <br />";
	$values = submit_sql($raw_sql);

	if ($values->total_rows >= 1) {
		return true;
	}

	return false; 
}


function parse_response() {
	if (known_phone()) {
	}	
}	


log_raw_message();
parse_response();
