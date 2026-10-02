# Viralliset lähteet ja niiden käyttö

Tarkistettu 2.10.2026. Erotamme dokumentoidun kattavuuden, tässä työssä kokeillun vastauksen ja vielä tarkistamattoman asian. HTTP 200 ei osoita aineiston täydellisyyttä.

## Eduskunta — tuotteen ensisijainen lähde

Nykyinen rajapinta on [api.eduskunta.fi](https://api.eduskunta.fi/), ja [OpenAPI-kuvaus](https://api.eduskunta.fi/openapi.json) kuvaa todelliset kentät. [Avoimen datan ohje](https://www.eduskunta.fi/fi/avoin-data/mita-on-avoin-data) ilmoittaa CC BY 4.0 -lisenssin, lähteen nimeämisvelvoitteen ja 10 000 tietueen erärajan. Vanhan avoindata.eduskunta.fi-palvelun käytöstä luovutaan vuoden 2026 lopussa ohjeen mukaan. Uusi toteutus ei käytä vanhaa taulurajapintaa.

Dokumentoitu verkkopalvelun historiallinen kattavuus: henkilöt vuodesta 1907, käsittelytiedot pääosin vuodesta 1970 (1919–1969 vain säädökseen johtaneet asiat), asiakirjat aineistosta riippuen 1980/1991, puheenvuorot syksystä 1999 ja äänestykset vuodesta 2008. Nämä ovat [hakupalvelun kattavuustietoja](https://www.eduskunta.fi/haku/hakuohje), eivät lupaus jokaisen API-kentän täydellisyydestä.

### Kokeillut rajapinnat

Kaikki alla olevat polut ovat suhteessa `https://api.eduskunta.fi/api/v1/`. Kutsut onnistuvat ilman API-avainta tässä kokeessa.

| Menetelmä ja polku | Havaittu rakenne | Toteutuksen käyttö |
| --- | --- | --- |
| POST `search` | `results[]`, `searchMetadata.totalResultCount`, `startFromIndex`; tyypitetty tulos, esim. `kansanedustaja` | Kaikki henkilörekisterin osumat sivutettuna |
| GET `kansanedustajat` | `kansanedustajat[]` | Ei käytetä täydellisenä tuontina: palautti vain 1 000 henkilöä |
| GET `kansanedustajat/1392` | `henkilonro`, `eduskuntaryhmat[]`, `vaalipiirit[]`, `edustajatoimet[]`, tilat ja kielikentät | Todellinen henkilötestiaineisto |
| GET `valtiopaivaasiat/HE%2074%2F2023%20vp` | `kasittelyt.fi[]`, `keskeisetAsiakirjat.fi[]`, `asiasanat.fi[]`, `ehdotukset.fi[]` | Asian aikajana ja dokumentoidut yhteydet |
| GET `asiakirjat/edktunnus/EDK-2023-AK-29738` | `edktunnus`, `eduskuntatunnus`, `fullText`, `kielikoodi`, `viimeisinJulkaisuajankohta` | Alkuperäisen asiakirjan metatiedot ja teksti |
| GET `taysistunnot/asian-aanestykset/HE%2074%2F2023%20vp` | Äänestystaulukko; `kohta`, `aanestysotsikko`, `aanestystapahtumat[]`, `aanestystulos` | Viisi eri äänestystä; ei yhtä lain kannatusnumeroa |
| GET `taysistunnot/aanestykset/2023-71-7` | Yksittäinen äänestys, 199 edustajamerkintää | Toistettava äänestystesti |
| POST `search`, category `puheenvuoro`, query `asumistuki` | Puhuja, asian tunnus, pöytäkirjaviite, alkuhetki, puheen teksti | Kahden osuman testiaineisto; ei kattava puhetuonti |
| GET `reference-data/eduskuntaryhmat`, `reference-data/vaalipiirit` | Viitetietotaulukot, nimi eri kielillä, `tunnus`, `aktiivinen` | Rakenteen tarkistus; tuotantokoodin jäsenyydet tulevat henkilöistä |

Henkilöhaun `category: kansanedustaja` palautti 2 677 osumaa. Toteutuksen 250 tietueen sivut tuotiin kokonaan, järjestyksenä `henkilonro`. Määrä on havainto API:n henkilörekisteristä; sitä ei pidä näyttää nykyisten kansanedustajien määränä. Lähteen tilat sisältävät `Nykyinen`, `Entinen` ja `Keskeytynyt`.

`henkilonro` henkilöissä ja puheissa vastaa äänimerkin `henkilonumero`-kenttää. Eduskuntaryhmän tunnus voi sisältää sekä koodin että nimen, esimerkiksi `KOK01~…`. Ryhmiä ei yhdistetä vain koodiprefiksillä. Eduskuntaryhmä ja puolue eivät ole sama entiteetti.

Asian `kasittelyt.fi` ei ole valmiiksi aikajärjestyksessä. Näyttö järjestetään tapahtumapäivän ja lähteen `jarjestys`-kentän mukaan. `viimeisinJulkaisuajankohta` on eri asia kuin poliittisen tapahtuman ajankohta: vuoden 2023 esityksessä havaittiin vuoden 2026 julkaisutietoja.

Puhehaun tarkkaa asiayhteysrajausta kokeiltiin usealla kenttäpolulla; ne palauttivat virheen tai nolla osumaa. Tätä ei tulkita puheiden puuttumiseksi. Puhetuonnin seuraava askel on varmistaa indeksin oikea rajaus ennen kattavuuslupausta. Yksittäisen puheen palauttama `asia.fi.eduskuntatunnus` säilytetään silti eksplisiittisenä yhteytenä.

OpenAPI kuvaa myös XML-, HTML- ja PDF-latauksia sekä asynkronisen `search/dataset`-viennin ja NDJSON-tulokset. Niitä ei tarvita ensimmäiseen henkilö- ja asiatuontiin. Lähde ei anna tässä tarkistetuissa ohjeissa numeerista kutsukiintiötä tai saatavuustakuuta. Tuonti tekee pyynnöt peräkkäin, käyttää pieniä taukoja ja rajattuja 429/5xx-uusintoja.

## Avoimuusrekisteri — ilmoitetut yhteydenpidot

[VTV:n avoimen datan ehdot](https://www.avoimuusrekisteri.fi/perustietoa/avoin-data) sallivat käytön CC BY 4.0 -ehdoin ja vaativat tuottajan, aineiston, lisenssin sekä muutosten mainitsemisen. Rajapinta on tarkoitettu kevyeen käyttöön; kapasiteettia ei taata. Vain uusimmat julkaistut ilmoitusversiot luvataan. Lähteen puuttuminen ei osoita yhteydenpidon puuttumista.

[Swagger](https://public.api.avoimuusrekisteri.fi/swagger/) ja [JSON-kuvaus](https://public.api.avoimuusrekisteri.fi/swagger-json) tarkistettiin. Julkiset GET-kutsut toimivat ilman avainta; ilmoitusten jättämisen Customer API on eri palvelutehtävä.

Kokeiltu `GET /open-data-term/all`: ensimmäinen palautettu raportointijakso alkaa 1.4.2024. Mukana on tulevia luonnoskausia vuoteen 2035 asti, joten kausien määrä ei ole julkaistun historian mittari. `GET /open-data-target/all/1` palauttaa kausikohtaiset kohdetunnukset ja nimet. `GET /open-data-activity-notification/term/1` palautti 1 004 ilmoitusta, joissa ovat `diaryNumber`, `companyId`, `termId` ja `topics[].contactedTargets[].contactedTargetId`.

Ilmoitusten julkaisemisaika ei ole tapaamisaika. Kausikohtaista kohdetunnusta ei voi suoraan yhdistää Eduskunnan henkilönumeroon. Tarvitaan erillinen tarkistettu vastaavuus, jonka peruste ja tarkistaja tallennetaan. Nimen yhtäläisyys ei yksin riitä automaattiseen yhdistämiseen.

[Rekisterin esittely](https://www.avoimuusrekisteri.fi/perustietoa/avoimuusrekisterin-esittely) kertoo ilmoittamisen olevan aihekohtaista ja ilmoittajien itsensä tekemää. Taloudelliset tiedot alkavat vuonna 2026 edellisen vuoden toiminnasta. Kyse ei ole täydellisestä tapaamiskalenterista eikä tietystä kansanedustajasta aiheutuneen äänestyksen selityksestä.

Tässä vaiheessa rajapinta on tutkittu, mutta sen henkilökytkentöjä tai jatkuvaa tuontia ei ole toteutettu.

## Vaali- ja puoluerahoitus — VTV:n CSV-aineistot

[Vaalirahoituksen tietoaineistot](https://www.vaalirahoitusvalvonta.fi/fi/index/vaalirahoitus/haetietoavaalirahoitusilmoituksista/tutkitietoaineistoja.html) sisältävät vaalikohtaiset ennakko-, varsinaiset ja jälki-ilmoitukset sekä rahoitusrivit. Sivulla ovat tällä hetkellä aluevaalit 2022/2025, eduskuntavaalit 2023, europarlamenttivaalit ja presidentinvaali 2024 sekä kuntavaalit 2025. Muiden ehdokkaiden ennakkoilmoituksilla on sivulla kuvattu poistumisaika; pysyvää kaikkien ehdokkaiden historiaa ei luvata.

Eduskuntavaalien 2023 `E_VI_eduskuntavaalit2023.csv` ladattiin ja sen todellinen rakenne tarkistettiin. UTF-8, puolipiste-erotin, yksittäiset lainausmerkit kenttien ympärillä, desimaalipilkku ja tyhjiä summakenttiä. Kenttiä ovat `Ehdokasnumero`, `Etunimet`, `Sukunimi`, `Vaalipiiri/Kunta`, `Puolue`, saapumis- ja muokkauspäivä sekä kulujen ja rahoituksen erittely. Älä käytä tavallista pilkulla pilkkomista tai tulkitse tyhjää summaa nollaksi. Rahasummat tallennetaan myöhemmin sentteinä.

Vaalin ja vaalipiirin tunnus tarvitaan ehdokasnumeron rinnalle. CSV ei sisällä tässä tarkistetussa tiedostossa Eduskunnan henkilönumeroa. Siksi nimipohjaiset henkilökytkennät vaativat erillisen validoinnin.

[Puoluerahoituksen aineisto](https://www.vaalirahoitusvalvonta.fi/fi/index/puoluerahoitus/haetietoailmoituksista/tietoaineistot.html) on eri aineisto; sitä ei saa esittää henkilön vaalirahoituksena.

CSV-sivulta ei vahvistettu yksilöityä uudelleenkäyttölisenssiä eikä erillistä julkista JSON-API:a. **Lisenssi on avoin selvityskohde, ei oletettu CC BY.** Integraatiota ja rahoitusaineiston uudelleenjulkaisua ei toteutettu tässä vaiheessa.

## Finlex — päätöksestä säädökseen

[Avoin data](https://www.finlex.fi/fi/avoin-data) ja [integraation pikaopas](https://www.finlex.fi/fi/avoin-data/integraation-pikaopas) kuvaavat REST-rajapinnan, Akoma Ntoso XML:n ja dokumenttien ajalliset versiot. Osoite on `https://opendata.finlex.fi/finlex/avoindata/v1`. [Tietosuojasivu](https://www.finlex.fi/fi/tietosuoja) vahvistaa avoimen aineiston CC BY 4.0 -lisenssin ja henkilötietojen käyttörajoitukset.

[Nykyinen OpenAPI YAML](https://opendata.finlex.fi/Finlex_avoin_data_v0_4_0.yaml) ladattiin Swaggerin osoittamasta polusta. Se vaatii `User-Agent`-otsakkeen. GET `/akn/fi/act/statute/2023/1241/fin@` palautti 200 ja Akoma Ntoso XML:n. Tämä säädösnumero löytyy HE 74/2023 vp:n `ehdotukset.fi[].saadoskokoelmaviite`-kentästä.

Testi vahvistaa linkin alkuperäiseen säädökseen, ei lain nykyistä voimassaoloa. Ajantasaisen säädöksen kieli- ja aikaversio pitää valita erikseen. Nykyinen dokumentaatio kertoo `isInForce`-rajauksesta ajantasaistetuille säädöksille. Täyttä historiallista kattavuutta, numeerista kutsukiintiötä ja kaikkia aineistolajeja ei tässä testattu.

Finlex-tuonti on seuraava integraatio; XML:n jäsentämistä ei vielä toteutettu.

## Sidonnaisuudet ja valiokuntatyö

Henkilöskeema sisältää `sidonnaisuudet`, `valiokuntajasenyydet` ja `toimielinjasenyydet`. Asiaskeema sisältää julkisia asiantuntijalausuntoja ja valiokuntakäsittelyjä. Näiden kenttien löytyminen ei tarkoita kaikkien sidonnaisuuksien tai valiokunnassa sanotun kattavaa dokumentaatiota. Julkaisemme vasta aineistokohtaisen tarkistuksen jälkeen; suljetuista keskusteluista ei rakenneta keinotekoista puuttumissignaalia.

## Toistettavuus

`test/fixtures/manifest.json` listaa viiden onnistuneen kutsun menetelmät, URL:t, POST-rungon, hakuaikaleimat ja SHA-256-tiivisteet. JSON-testitiedostot ovat sellaisinaan saadut vastaukset, eivät keksittyä poliittista sisältöä. Aineiston tuottaja: Eduskunta. Lisenssi: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Testiaineiston uudelleenjärjestely käyttöliittymää varten on johdettua käsittelyä ja merkitään sellaiseksi.

Muiden lähteiden testilataukset eivät kuulu julkiseen testiaineistoon. Havainnot on dokumentoitu yllä. Tulevan integraation tulee tallentaa vastaavat lähde- ja lisenssitiedot omalle aineistolleen.
