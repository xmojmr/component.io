<?php
$url = 'http://component-crawler.herokuapp.com/.json';
$targetDir = str_replace('\\', '/', __DIR__ . '/../');
$targetFile = $targetDir . 'crawler.json';

date_default_timezone_set('UTC');
$tempFile = $targetDir . date('Y-m-d-H-i') . '.json';

// http://stackoverflow.com/a/6409531/2626313
set_time_limit(0);
$fp = fopen ($tempFile, 'w+');//This is the file where we save the    information
$ch = curl_init(str_replace(" ","%20",$url));//Here is the file we are downloading, replace spaces with %20
curl_setopt($ch, CURLOPT_TIMEOUT, 50);
curl_setopt($ch, CURLOPT_FILE, $fp); // write curl response to file
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_exec($ch); // get curl response
curl_close($ch);
fclose($fp);

$status = 'updated';
if (!rename($tempFile, $targetFile))
{
  $status = 'failed';
}

header('Content-Type: application/json');
echo json_encode(array('status' => $status));
die();