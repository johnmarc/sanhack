<?
//Globals cause I'm a terrible person


function submit_sql($sql) { 

	$submit_url = "http://sanhack.cartodb.com/api/v2/sql?q=";
	$apikey = file_get_contents("apikey.txt");
	$api_connect = "&api_key=$apikey";
	$full_url = $submit_url . urlencode($sql) . $api_connect;
	$json = exec("curl \"" . $full_url . "\"");
	return json_decode($json);
}

function log_raw_message() {
	if(isset($_GET['msg']) && isset($_GET['num'])) {
		$message = $_GET['msg'];
		$number = $_GET['num'];
	}
	if(isset($_GET['SmsStatus'])) {
		$number = $_GET['From'];
		$message = $_GET['Body'];
	}

	$raw_msg_insert_sql = "INSERT INTO message_logs (message, phone) VALUES ( '$number', '$message' )";
	$values = submit_sql($raw_msg_insert_sql); 
	
	if ($values->total_rows != 1) {
		print "more than expected number of rows\n <br />";
	}
}

//Returns true if we already know the sender
function known_phone() {
	if(isset($_GET['msg']) && isset($_GET['num'])) {
		$message = $_GET['msg'];
		$number = $_GET['num'];
	}
	if(isset($_GET['SmsStatus'])) {
		$number = $_GET['From'];
		$message = $_GET['Body'];
	}
	$raw_sql = "SELECT * FROM phone_registration WHERE phone = '$number'";
	$values = submit_sql($raw_sql);

	if ($values->total_rows >= 1) {
		return true;
	}

	return false; 
}

function insert_attendance($count_m, $count_f, $number) {
	if (!is_null($count_m) && !is_null($count_f)) {
		$raw_sql = "INSERT INTO daily_class_count (attendance_m, attendance_f, phone) VALUES "
			 . "( '$count_m', '$count_f', '$number' )";
		$values = submit_sql($raw_sql);
		if ($values->total_rows == 1) {
			return true; 
		}
		return false;
	}

	if (!is_null($count_m)) {
		$raw_sql = "INSERT INTO daily_class_count (attendance_m, phone) VALUES "
			. "( '$count_m', '$number')";
		$values = submit_sql($raw_sql);
		if ($values->total_rows == 1) {
			return true;
		}
		return false;
	}
	if (!is_null($count_f)) {
		$raw_sql = "INSERT INTO daily_class_count (attendance_f, phone) VALUES "
			. "( '$count_f', '$number')";
		$values = submit_sql($raw_sql);
		if ($values->total_rows == 1) {
			return true;
		}
		return false;
	}
	//shouldn't be here
	return false;
}

function send_sms($number, $message) {
	$auth_token = file_get_contents("twilio.txt");
	$curl = "curl -X POST 'https://api.twilio.com/2010-04-01/Accounts/ACc8d605ab20ee83c7ddb4d26cb615b6eb/SMS/Messages.json' -d 'From=%2B13476479041' "
	. "-d 'To=" . urlencode($number) .  "' -d 'Body=" . urlencode($message) . "' -u ACc8d605ab20ee83c7ddb4d26cb615b6eb:" . $auth_token;
	error_log($curl);
	$json = exec($curl);
	error_log(print_r($json, true));
}


function parse_message() {
	if(isset($_GET['msg']) && isset($_GET['num'])) {
		$message = $_GET['msg'];
		$number = $_GET['num'];
	}
	if(isset($_GET['SmsStatus'])) {
		$number = $_GET['From'];
		$message = $_GET['Body'];
	}
	if ( is_numeric($message)) {
		$success = insert_attendance(null, $message, $number);
	} else {
		$count_m = null; $count_f = null;
		$splits = explode(" ", $message );
		foreach ($splits as $part) { 
			$girls = explode("F", $part);
			if (is_numeric($girls[0])) {
				$count_f = $girls[0];
			}
			$girls = explode('f', $part);
			if (is_numeric($girls[0])) {
				$count_f = $girls[0];
			}
			$girls = explode('g', $part);
			if (is_numeric($girls[0])) {
				$count_f = $girls[0];
			}
			$girls = explode('G', $part);
			if (is_numeric($girls[0])) {
				$count_f = $girls[0];
			}

			$boys = explode('M', $part);
			if (is_numeric($boys[0])) {
				$count_m = $boys[0];
			}
			$boys = explode('m', $part);
			if (is_numeric($boys[0])) {
				$count_m = $boys[0];
			}
			$boys = explode('B', $part);
			if (is_numeric($boys[0])) {
				$count_m = $boys[0];
			}
			$boys = explode('b', $part);
			if (is_numeric($boys[0])) {
				$count_m = $boys[0];
			}
		}

		if (!is_null($count_m) || !is_null($count_f)) {		
			$success = insert_attendance($count_m, $count_f, $number);
		} else {
			$success = false;
		}
	}		
	if (!$success) {
		//send_error_reply();
		print "I was unable to understand your message\n<br>";
		send_sms($number, "I was unable to understand your message");
	} else {
	
		if (!known_phone()) {
			print "Please tell me who you are\n<br>";
			send_sms($number, "Please tell me who you are");
			//send_who_are_you()	
		} else {
			print "Thanks for your report!\n<br>";
			send_sms($number, "Thanks for your report!");
			//send_thanks()
		}	
	}
}	


log_raw_message();
parse_message();
