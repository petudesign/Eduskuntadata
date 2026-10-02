# Eduskuntadata

See what Finland’s members of Parliament actually do through votes, speeches, decisions, and the sources behind the headlines.

Suomen eduskuntatyön tutkimisen perusta. Palvelu avaa dokumentoidun toiminnan ja lähteet; se ei pisteytä poliitikkoja tai suosittele äänestysvalintaa.

## Tutkimus ja tuotepäätökset

- [Viralliset lähteet, nykyiset rajapinnat, lisenssit ja havaitut rajoitukset](docs/sources.md)
- [Tietomalli, informaatioarkkitehtuuri, käyttäjäpolut ja toteutusjärjestys](docs/product-and-architecture.md)

Lähteet tarkistettu 2.10.2026. Toteutus käyttää nykyistä `api.eduskunta.fi`-rajapintaa. Vaalirahoitus, avoimuusrekisteri ja Finlex on tutkittu; niiden jatkuvia integraatioita ei ole vielä toteutettu.

## Käynnistys

Node.js 22.14+; `node:sqlite` on tässä Node-versiossa kokeellinen ja tulostaa varoituksen. Käyttöliittymä käyttää Reactia ja Viteä. API-avainta ei tarvita. SQLite-tiedosto luodaan paikallisesti `data/`-hakemistoon, joka ei kuulu Gitiin.

```sh
npm ci
npm test
npm run check
npm run demo
npm run dev
```

Käyttöliittymä: **http://127.0.0.1:5174/**. `dev` käynnistää myös paikallisen API:n porttiin 3001. Haku, henkilörekisteri, aiheiden ja asioiden listat, käsittelyketju, asiakirjat, yksittäiset äänestykset, henkilöäänet, profiilit sekä lähteet ja kattavuus ovat käytettävissä. Tavalliset linkit ja GET-lomakkeet säilyttävät osoitteet ja selaimen takaisin/eteen-toiminnot.

Käännetty paikallinen versio käynnistyy samalla API-palvelimella:

```sh
npm run build
npm start
```

Osoite **http://127.0.0.1:3001/**. Sulje `dev` ennen `start`-komentoa, koska ne käyttävät samaa API-porttia. Palvelin kuuntelee vain paikallista konetta. Julkista palvelua ei ole vielä otettu käyttöön.

`demo` käyttää pieniä oikeita Eduskunnan vastauksia 2.10.2026. Se ei ole simuloitu poliittinen aineisto eikä kattava tietokanta: yksi henkilö, yksi asia, viisi asiakirjaviitettä (yhden kokoteksti), yksi äänestys ja kaksi puhehaun osumaa. Puheiden tekstiosumat voivat koskea eri asioita. Fixture-manifesti sisältää kutsut, hakurungot ja tiivisteet.

Hae oikea henkilörekisteri ja yhden asian asiakirjat sekä kaikki lähteen palauttamat äänestykset:

```sh
npm run sync -- "HE 74/2023 vp"
```

Henkilöt haetaan sivutettuna hausta, koska suora listaus palautti kokeessa vain 1 000 henkilöä. Live-tuonti onnistui 2.10.2026: 2 677 henkilörekisterin tietuetta, viisi asiakirjaa, viisi äänestystä ja 995 edustajakohtaista äänimerkintää. Määrät eivät tarkoita nykyisten kansanedustajien lukumäärää tai koko eduskuntatyön kattavuutta. `sync` ei vielä kerää puheita.

Tuonti on toistettava: olemassa olevat tietueet päivitetään, muuttuneet lähdevastaukset säilytetään uusina snapshoteina. Koko tuonti kirjoitetaan yhdessä transaktiossa vasta onnistuneen keruun jälkeen. Haku- tai tallennusvirhe jättää aiemman aineiston käyttöön. Epäonnistuminen näkyy tuontilokissa ja käyttöliittymässä. Tuonti ei vielä poista lähteestä kadonneita henkilöitä tai asioita.

Valinnaisesti `EDUSKUNTADATA_DB` valitsee tietokantapolun. Demo ja live käyttävät oletuksena samaa tietokantaa; aiemmin tuotu aineisto säilyy. Käytä eri tietokantapolkuja halutessasi erilliset aineistot.

## Paikallinen lukurajapinta

Osoite `http://127.0.0.1:3001`. Palvelu ei kutsu ulkoisia lähteitä käyttäjän pyynnöstä.

| Reitti | Tulos |
| --- | --- |
| GET `/api/status` | Paikalliset määrät ja viimeisten tuontien tilat |
| GET `/api/search?q=asumistuki` | Eri tietuelajit; valinnainen `kind=person` jne. |
| GET `/api/browse?kind=person&state=Nykyinen&offset=0` | Suodatettu lista; `q`, 50 tietuetta sivulla, kokonaismäärä |
| GET `/api/topic?id=http%3A%2F%2Fwww.yso.fi%2Fonto%2Fyso%2Fp13997` | Virallinen asiasana ja siihen liitetyt tuodut asiat |
| GET `/api/vote?id=2023-71-7` | Äänestys, siihen liittyvä asia ja henkilöäänet lähdeviitteineen |
| GET `/api/trace?id=HE%2074%2F2023%20vp` | Asian aikajana, dokumentit, aiheet ja äänestykset |
| GET `/api/people/1392` | Henkilö, ajalliset jäsenyydet ja tuodut äänet/puheet |
| GET `/api/entity?id=document:EDK-2023-AK-29738` | Yksittäinen tietue ja lähdeviite |

Jokainen tärkeä tietue sisältää lähdeviitteen, aikaleimat, lisenssin ja snapshotin tiivisteen. Haku on yksinkertainen AND-merkkijonohaku: se ei vielä yhdistä vapaamuotoista uutisväitettä automaattisesti asiaketjuun. `npm run search -- asumistuki` ja `npm run trace -- "HE 74/2023 vp"` toimivat myös komentoriviltä.

## Tiedostot ja varmennus

`src/client.mjs` kerää aineiston, `normalize.mjs` käsittelee lähteen rakenteen, `store.mjs` säilyttää ja lukee sen, `schema.sql` rajoittaa tietomallia. CLI ja HTTP-palvelu käyttävät samaa lukumallia.

12 testiä tarkistavat lähdeketjun, yksilöäänet, JSON Pointer -viitteet, toistuvat ja korjatut tuonnit, koko tuonnin peruutuksen, sivutuksen katkeamisen/duplikaatit, 429-uusinnat, listauksen ja suodatuksen, aikajanan vaihevalinnan sekä lukurajapinnan ja staattisen tarjoilun. Testit eivät tarvitse verkkoyhteyttä.

Käyttöliittymän koodi on `web/src/`-hakemistossa. [Visuaalinen toteutusmalli](docs/design/spec.md) ja [selainvarmennus](docs/design/verification.md) kuvaavat näkymät ja tarkistetut polut. Suunnittelukuvat ovat dokumentaatiota; varsinainen käyttöliittymä on HTML/CSS/Reactia.

Testiaineiston tuottaja: **Eduskunta**, [Eduskunnan avoin data](https://api.eduskunta.fi/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). JSON-testivastaukset ovat alkuperäisiä. Lukumallin normalisointi ja järjestäminen on palvelun tekemää käsittelyä. Älä julkaise paikallista tietokantaa raakadumppina: snapshotit voivat sisältää henkilöaineiston yhteystietoja.
