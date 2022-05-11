<?php

set_error_handler(function ($errno, $errstr, $errfile, $errline ) {
    throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
});

const INSTALLER_VERSION = "1";
$repoVersion = 1;
$types = ["wpackagist-plugin", "wordpress-plugin", "wpackagist-muplugin", "wordpress-muplugin", "library"];

function createPackage($plugin, $tag, $type = "wpackagist-plugin") {
    $dependencies = [
        "arnaud-ritti/gravityforms-installer" => '^1.0',
        "composer/installers" => "^1.0 || ^2.0"
    ];
    return [
        "name" => sprintf("gravityforms/%s", getSlug($plugin["name"])),
        "description" => $plugin["title"],
        "version" => $tag,
        "type" => $type,
        "license" => "GPL-2.0-or-later",
        "support" => [
            "docs" => $plugin["documentation_url"]
        ],
        "homepage" => $plugin["detail_url"],
        "dist" => [
            "type" => "zip",
            "url" => sprintf('https://gravityapi.com/wp-content/plugins/gravitymanager/api.php?op=get_plugin&slug=%s', $plugin["name"])
        ],
        "require" => $dependencies
    ];
}

function getSlug($name){
    if(strpos($name, "gravityforms") == 0 && !in_array($name, ['gravityforms', 'gravityforms-beta'])){
        $name = str_replace('gravityforms', '', $name);
    }

    return $name;
}

// The url to retrieve all available Advanced Custom Fields packages from
$response = @file_get_contents("https://gravityapi.com/wp-content/plugins/gravitymanager/api.php?op=get_plugins");
if ($response === false) {
    echo "Error retrieving package information";
    die(1);
}

$plugins = unserialize($response);
$data = [];
foreach ($plugins as $plugin) {
    $details = @file_get_contents(sprintf('https://gravityapi.com/wp-content/plugins/gravitymanager/api.php?op=get_plugin&slug=%s', $plugin["name"]));
    if ($details !== false) {
        $details = unserialize($details);

        foreach ($types as $type) {
            if(empty($data[$type])){
                $data[$type] = ["packages" => []];
            }
            $versions = [];
            $versions['dev-master'] = createPackage($details, 'dev-master', $type);
            $versions[$details["version_latest"]] = createPackage($details, $details["version_latest"], $type);
            $data[$type]['packages'][sprintf("gravityforms/%s", getSlug($details["name"]))] = $versions;
        }
    }
}


foreach($data as $type => $entries){
    $output = json_encode((object)$entries, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    $outputDir = __DIR__ . "/composer/v" . $repoVersion;
    if (!is_dir($outputDir . "/{$type}")) {
        mkdir($outputDir . "/{$type}", 0777, true);
    }
    file_put_contents("{$outputDir}/{$type}/packages.json", $output);
    if ($type == "wpackagist-plugin") {
        file_put_contents("{$outputDir}/packages.json", $output);
    }
}