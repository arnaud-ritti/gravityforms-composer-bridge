# Gravity Forms Composer Bridge with Dependabot

**1. Add the desired repository to the repositories field in composer.json**

Select one of the following repositories based on the desired plugin type:

***Wordpress Packagist plugin***

Use this version if you are unsure which version to use.
```json
{
  "type": "composer",
  "url": "https://gf-composer-proxy.arnaud-ritti.workers.dev/wordpress-plugin/"
}
```
***Wordpress Packagist Must-Use plugin***

Use this version if you want Gravity Forms installed as MU-plugin.
```json
{
  "type": "composer",
  "url": "https://gf-composer-proxy.arnaud-ritti.workers.dev/wordpress-muplugin/"
}
```

***Wordpress wpackagist plugin type***

Use this repository URL if you use the `wpackagist-plugin` plugin type.
```json
{
  "type": "composer",
  "url": "https://gf-composer-proxy.arnaud-ritti.workers.dev/wpackagist-plugin/"
}
```

***As regular composer dependency***

To install the plugin in the `vendor` directory.

```json
{
  "type": "composer",
  "url": "https://gf-composer-proxy.arnaud-ritti.workers.dev/library/"
}
```

**2. Setup your composer authentification**


```sh
composer config [--global] http-basic.gf-composer-proxy.arnaud-ritti.workers.dev licensekey [YOUR_GRAVITYFORMS_KEY]
```


**3. Setup dependabot registry**

```yaml
version: 2
registries:
  gravityforms:
    type: composer-repository
    url: https://gf-composer-proxy.arnaud-ritti.workers.dev/wordpress-muplugin/
    username: licensekey
    password: "${{secrets.GRAVITYFORMS_KEY}}"

updates:
  - package-ecosystem: composer
    directory: "/"
    schedule:
      interval: daily
      time: "14:00"
      timezone: Europe/Paris
    open-pull-requests-limit: 10
    registries:
      - gravityforms
```