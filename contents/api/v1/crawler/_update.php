<?php
error_reporting(E_STRICT|E_ALL);

$url = 'http://component-crawler.herokuapp.com/.json';
$targetDir = str_replace('\\', '/', __DIR__ . '/../');
$targetFile = $targetDir . 'crawler.json';

date_default_timezone_set('UTC');
$tempFile = $targetDir . date('Y-m-d-H-i') . '.json';

$ok = TRUE;

function deleteProperties($object, $propertyNames)
{
    if (!isset($object))
        return;
        
    foreach ($propertyNames as $propertyName)
    {
        unset($object->{$propertyName});
    }
}

class TagDictionary
{
    protected $_dictionary;
    
    public function __construct()
    {
        $this->_dictionary = array();
    }
    
    protected function _getHashValue($value)
    {
        return $value;
    }
    
    protected function _getNormalizedValue($value)
    {
        return $value;
    }
    
    public function toArray()
    {
        return $this->_dictionary;
    }
    
    /**
    * Calculates keyword's score. The higher the score the more likely it is that
    * this representation is correct.
    * 
    * Current implementation upvotes the keyword if it contains upper case characters
    */
    protected function _getScore($value)
    {
        $result = 1;
        for ($i = 0; $i < mb_strlen($value); $i++)
        {
            $ch = mb_strcut($value, $i, 1);
            if (ctype_upper($ch))
            {
                $result++;
            }    
        }
        return $result;
    }
    
    public function add($value)
    {
        $value = $this->_getNormalizedValue($value);
        $hash = $this->_getHashValue($value);
        $score = $this->_getScore($value);

        if (!isset($this->_dictionary[$hash]))
        {
            $this->_dictionary[$hash] = array($value => $score);
        }
        else if (!isset($this->_dictionary[$hash][$value]))
        {
            $this->_dictionary[$hash][$value] = $score;
        }
        else
        {
            // Increase the existing keyword's score. It is here in order to
            // decrease weight of keywords with good score but which are actually
            // typos.
            //
            // Keyword's score is raised each time it is used
            $this->_dictionary[$hash][$value] += $score;
        }
        return $value;
    }
    
    public function getBestFitCandidate($value)
    {
        $hash = $this->_getHashValue($this->_getNormalizedValue($value));
        
        $values = $this->_dictionary[$hash];
        
        if (count($values) == 1)
        {
            reset($values);
            return strval(key($values));
        }
        
        $bestCandidate = null;
        $bestScore = -1;    // anything smaller then the smallest score returned by _getScore
        
        foreach ($values as $candidate => $score)
        {
            if ($score > $bestScore)
            {
                $bestScore = $score;
                $bestCandidate = $candidate;
            }
        }
        
        return strval($bestCandidate);    
    }
}

class KeywordDictionary extends TagDictionary
{
    protected function _getHashValue($value)
    {
        return mb_strtolower($value);    
    }
    
    protected function _getNormalizedValue($value)
    {
        return str_replace('-', ' ', trim($value));        
    } 
}

class LicenseDictionary extends TagDictionary
{
    protected function _getHashValue($value)
    {
        return mb_strtolower(str_replace('-', ' ', $value));    
    }
    
    protected function _getNormalizedValue($value)
    {
        return trim($value);    
    }
}

try
{
    // http://stackoverflow.com/a/6409531/2626313
    set_time_limit(0);
    $fp = fopen ($tempFile, 'w+');//This is the file where we save the    information
    $ch = curl_init(str_replace(" ","%20",$url));//Here is the file we are downloading, replace spaces with %20
    curl_setopt($ch, CURLOPT_TIMEOUT, 50);
    curl_setopt($ch, CURLOPT_FILE, $fp); // write curl response to file
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    $ok = curl_exec($ch); // get curl response
    curl_close($ch);
    fclose($fp);

    if ($ok)
    {
        // List of of properties not needed by the search application
        $redundantCrawlerProperties = array(
            'users'
        );
        $redundantComponentProperties = array(
            'scripts',
            'main',
            'repository',
            'contributors',
            'author',
            'name',
            'styles',
            'development',
            'dependencies',
            'files'
        );
        $redundantGithubProperties = array(
            'id',
            'name',
            'full_name',
            'description',
            'homepage',
            'url',
            'size',
            'language',
            'has_issues',
            'has_downloads',
            'has_wiki',
            'watchers',
            'default_branch',
            'master_branch',
            'score'
        );
        $redundantOwnerProperties = array(
            'login',
            'id',
            'url',
            'site_admin'
        );
        
        $crawler = json_decode(file_get_contents($tempFile));

        deleteProperties($crawler, $redundantCrawlerProperties);
        
        $keywordDictionary = new KeywordDictionary();
        $licenseDictionary = new LicenseDictionary();

        // In the first pass normalize values and populate dictionaries
        foreach ($crawler->components as $no => $component)
        {
            deleteProperties($component, $redundantComponentProperties);
            if (isset($component->github))
            {
                deleteProperties($component->github, $redundantGithubProperties);
                deleteProperties($component->github->owner, $redundantOwnerProperties);
            }
            
            // Register and normalize keywords
            if (isset($component->keywords))
            {
                $keywords = array();
                
                // Well-formed keywords should be an array of strings. However in
                // some cases the strings may be (although should not) delimited strings.
                // This code does the correction
                foreach ($component->keywords as $subKeywords)
                {
                    foreach (explode(',', $subKeywords) as $subKeyword)
                    {
                        $keyword = $keywordDictionary->add($subKeyword);
                        $keywords[] = $keyword;
                    }    
                }
                
                $component->keywords = $keywords;
            }
            
            // Register and normalize licenses
            {
                $licenses = array();
                
                $licenseSources = null;
                if (isset($component->licenses))
                {
                    $licenseSources = $component->licenses;
                }
                else if (isset($component->license))
                {
                    $licenseSources = $component->license;
                    if (!is_array($licenseSources))
                    {
                        $licenseSources = explode('/', $licenseSources);
                    }
                }

                if (isset($licenseSources)) 
                {
                    if (!is_array($licenseSources))
                    {
                        $licenseSources = array($licenseSources);
                    }
                    
                    foreach ($licenseSources as $id => $licenseSource)
                    {
                        if (is_string($licenseSource))
                        {
                            $license = trim($licenseSource);
                        }
                        else
                        {
                            $license = $licenseSource->type;
                        }
                        
                        if (isset($license))
                        {
                            if (filter_var($license, FILTER_VALIDATE_URL) !== FALSE)
                            {
                                // It is an url link to the license text. I'll make
                                // it "pretty" assuming it is a license linked from
                                // http://opensource.org/licenses/alphabetical
                                $license = basename(parse_url($license, PHP_URL_PATH), ".php");
                                
                                $license = str_replace('-license', '', $license);
                            }
                            
                            $licenses[] = $license;
                        }    
                    }                        
                }
                
                unset($component->license);
                unset($component->licenses);
                
                if (isset($licenses) && count($licenses) > 0)
                {
                    $component->license = $licenses;
                }
                
                foreach ($licenses as $license)
                {
                    $licenseDictionary->add($license);
                }
            }
        }
        
        // In the second pass map keywords and licenses to values recommended by
        // dictionaries (for user's best search experience)
        foreach ($crawler->components as $no => $component)
        {
            if (isset($component->keywords))
            {
                $keywords = array();
                
                foreach ($component->keywords as $keyword)
                {
                    $keywords[] = $keywordDictionary->getBestFitCandidate($keyword);
                }
                
                $component->keywords = $keywords;
                
                unset($keywords);
            }
            
            if (isset($component->license))
            {
                $licences = array();
                
                foreach ($component->license as $license)
                {
                    $licenses[] = $licenseDictionary->getBestFitCandidate($license);
                }

                switch (count($licenses))
                {
                    case 0:
                        unset($component->license);
                        break;
                        
                    case 1:
                        $component->license = array_shift($licenses);
                        break;
                        
                    default:
                        $component->license = $licenses;
                        break;
                }
                unset($licenses);                
            }
        }
        
        /* TODO: DEBUG:
        $crawler->keywords = $keywordDictionary->toArray();
        $crawler->licenses = $licenseDictionary->toArray();
        */
        
        if (file_put_contents($targetFile, json_encode($crawler /* TODO: DEBUG: JSON_PRETTY_PRINT */)) === FALSE)
        {
            $ok = FALSE;
        }
    }
}
catch (\Exception $e)
{
    $ok = FALSE;
}
$status = 'updated';
if (!$ok)
{
    $status = 'failed';
}

unlink($tempFile);

header('Content-Type: application/json');
echo json_encode(array('status' => $status));
die();