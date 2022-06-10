# Gravity Forms Composer Bridge

[![Build Status](https://img.shields.io/endpoint.svg?url=https%3A%2F%2Factions-badge.atrox.dev%2Farnaud-ritti%2Fgravityforms-composer-bridge%2Fbadge%3Fref%3Dmain&style=flat)](https://actions-badge.atrox.dev/arnaud-ritti/gravityforms-composer-bridge/goto?ref=main)

This repository acts as a bridge to use the excellent [Gravity Forms](https://www.gravityforms.com/)
Wordpress plugin together with [Composer](https://getcomposer.org)/[Bedrock](https://roots.io/bedrock/).

## :warning: Your are using dependabot to manage your dependencies ?

Please check the related [documention file](dependabot_usage.md).

## How to install
**1. Add the desired repository to the repositories field in composer.json**

Select one of the following repositories based on the desired plugin type:

***Wordpress Packagist plugin***

Use this version if you are unsure which version to use.
```json
{
  "type": "composer",
  "url": "https://arnaud-ritti.github.io/gravityforms-composer-bridge/composer/v1/wordpress-plugin/"
}
```
***Wordpress Packagist Must-Use plugin***

Use this version if you want Gravity Forms installed as MU-plugin.
```json
{
  "type": "composer",
  "url": "https://arnaud-ritti.github.io/gravityforms-composer-bridge/composer/v1/wordpress-muplugin/"
}
```

***Wordpress wpackagist plugin type***

Use this repository URL if you use the `wpackagist-plugin` plugin type.
```json
{
  "type": "composer",
  "url": "https://arnaud-ritti.github.io/gravityforms-composer-bridge/composer/v1/wpackagist-plugin/"
}
```

***As regular composer dependency***

To install the plugin in the `vendor` directory.

```json
{
  "type": "composer",
  "url": "https://arnaud-ritti.github.io/gravityforms-composer-bridge/composer/v1/library/"
}
```

**2. Make your ACF PRO key available**

Set the environment variable **`GRAVITYFORMS_KEY`**.

Alternatively you can add an entry to your **`.env`** file:

```ini
# .env (same directory as composer.json)
GRAVITYFORMS_KEY=Your-Key-Here
```

**3. Require Gravity Forms**

You can now use composer as usual
```sh
composer require gravityforms/gravityforms
```

***3.b. Require an add-on***

```sh
composer require gravityforms/<slug>
```

## How does it work
This Github repository is a 'Composer repository'.
Actually a composer repository is simply a packages.json served from a webserver.
This repository uses Github Actions to periodically create a packages.json that references 
the files provided by Gravity Forms. Please note that these files require a valid license key that is **not provided** by this repository.
In order to append this license key to the files, [https://github.com/arnaud-ritti/gravityforms-installer](https://github.com/arnaud-ritti/gravityforms-installer) is used.
This installer detects that you want to install advanced custom fields, and then appends the provided private key (via environment variable) to the actual download URL on servers (so the key is never send to this composer repository).

## Available versions
See [https://arnaud-ritti.github.io/gravityforms-composer-bridge/composer/v1/wpackagist-plugin/packages.json](https://arnaud-ritti.github.io/gravityforms-composer-bridge/composer/v1/packages.json)

## Example(s)

1. Installs Gravity Forms as mu-plugin in web/app/mu-plugins/gravityforms
```json
{
  "name": "example/test",
  "repositories": [
    {
      "type": "composer",
      "url": "https://arnaud-ritti.github.io/gravityforms-composer-bridge/composer/v1/wordpress-muplugin/"
    },
    {
      "type": "composer",
      "url": "https://wpackagist.org"
    }
  ],
  "require": {
      "gravityforms/gravityforms": "^2.6.3"
  },
  "extra": {
    "installer-paths": {
      "web/app/mu-plugins/{$name}/": ["type:wordpress-muplugin"]
    }
  }
}
```

2. Installs Gravity Forms as plugin in wp-content/plugins/gravityforms
```json
{
    "name": "example/test",
    "repositories": [
      {
        "type": "composer",
        "url": "https://arnaud-ritti.github.io/gravityforms-composer-bridge/composer/v1/wordpress-plugin/"
      },
      {
        "type": "composer",
        "url": "https://wpackagist.org"
      }
    ],
    "require": {
      "gravityforms/gravityforms": "^2.6.3"
    },
    "extra": {
      "installer-paths": {
        "wp-content/plugins/{$name}/": ["type:wordpress-plugin"]
      }
    }
  }
```
