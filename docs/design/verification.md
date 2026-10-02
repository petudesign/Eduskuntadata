# Käyttöliittymän varmennus

2.10.2026. Paikallinen toimiva MVP, ei julkaistu julkinen palvelu.

## Mallit ja menetelmä

Toteutusmallit: [etusivu](home-concept.png) ja [käsittelyketju](trace-concept.png), molemmat 1435 × 1096. Ne tuotettiin Built-in Image Genillä ennen käyttöliittymän toteutusta. Brief: suomenkielinen lähteisiin perustuva tutkimuspalvelu, rauhallinen valkoinen editorial-asettelu, tumma serif-otsikko, vihreät linkit, natiivi haku, yksi todellinen esimerkkiasia ja avoin lähdesarake. Ei keksittyjä poliittisia mittareita, pisteytyksiä, suosituksia tai kuvaksi renderöityjä säätimiä. Trace-brief käytti samaa järjestelmää ja asian oikeita tunnuksia, päivämääriä ja lähteitä.

Varmennus tehtiin Codexin IAB-selaimella, DOM-/saavutettavuustarkastelulla ja käyttöliittymän oikeita säätimiä käyttämällä. Kehitysversio portissa 5174 ja käännetty versio portissa 3002 samalla `createApi`-palvelimella. Käännetyn version tarkistuspalvelin poistettiin lopuksi; kehitysversio jätettiin käyttäjälle avoimeksi.

Näyttökoon override: 1435 × 1096 ja mobiili 390 × 844. DOM vahvisti leveydet; vierityspalkin jälkeen käytettävä leveys oli 1420 ja 375. Myös selaimen oma muuttuva paneelileveys tarkistettiin, ja override palautettiin lopuksi. IAB:n palauttamat desktop-kuvat ovat hieman pienempiä ja skaalautuvat paneelin mukaan: täydellistä 1:1 rasterivertailua ei voi vahvistaa tällä kaappausmenetelmällä. DOM-mitat, computed CSS ja mobiilikuvat täydentävät tarkistusta. Tämä on kaappauksen rajoitus, ei väite pikselintarkasta identtisyydestä.

`view_image`-työkalulla tarkastettiin molemmat mallikuvat ja lopulliset selaimen renderöinnit sekä mobiili. [Etusivun renderöinti](home-render.png), [ketjun renderöinti](trace-render.png), [etusivu mobiilissa](home-mobile.png), [ketju mobiilissa](trace-mobile.png).

## Kuvavertailu ja korjaukset

| Vertailukohta | Malli / havaittu ero | Korjaus ja lopputulos |
| --- | --- | --- |
| Etusivun tekstit | H1, nav, haun label, placeholder, painike ja esimerkkilinkit lukittu mallissa | Samat tekstit ja järjestys. Päivä on esityksen antopäivä 12.10.2023; määrät tulevat API:sta. |
| Hakukenttä | Ensimmäinen toteutus päättyi ennen oikean sarakkeen reunaa | Haku jatkuu koko sisältöleveyden yli, korkeus 60px, painike oikeassa reunassa. |
| Typografia | Ensimmäinen Georgia-arvio tuotti mallia leveämmät ja raskaammat otsikot | Times New Roman / serif sovitettu mallin muotoon; h1 72/60px, body Arial 18px, mobiilin h1 38px. Säätimien koko määritelty erikseen. |
| Kattavuussarake | Ensimmäinen versio käytti liian suurta erillistä määrää | Määrä ja ”henkilötietuetta” samalla rivillä; avoin sarake, yläviiva ja pystyraja mallin mukaan. |
| Värit ja pinnat | Malli käyttää valkoista taustaa, tummia otsikoita ja vihreitä linkkejä | Valkoinen `#fff`, teksti `#23302a`, aksentti `#245c48`, viivat `#d9e1dc`; ei gradientteja, kuvia tai ylimääräisiä korttiruudukoita. |
| Aikajana | Ensimmäinen versio oli liian väljä ja tekstin aloitus liian lähellä päivää | Numero/päivä/kuvaus-sarakkeet, viivat ja lähdeavaus sovitettu malliin. Kaikki 68 lähdevaihetta avautuvat. |
| Ikonit ja säätimet | Haku, nuolet ja lähdechevronit ovat oikeita säätimiä | Yhtenäiset currentColor-SVG:t, 24px / 1.75px viiva. Näkyvä fokus, natiivit formit ja details. Mobiilin lähdeavausten kosketuskohde vähintään 44px. |
| Mobiili | Sarakkeet ja pitkä taulukko eivät mahdu desktop-muodossa | Yksi sarake, nav säilyy, välilehtien tarpeeton pystyvieritys korjattu. Sivun leveys ei ylitä viewportia. Taulukko vierii oman alueensa sisällä (510px taulukko / 335px alue). |
| Aineiston esitys | Päivä oli lokalisoitu objekti ja vaiheen fraasi sisäkkäinen kenttä | Suomenkielinen päivä ja `fraasi.fraasisisalto` luetaan oikein. Alkuperäiset kuvaukset säilyvät, HTML esitetään tekstinä. |

Etusivun näkyvän tekstin vertailu: ei lisättyjä markkinointiväitteitä tai uusia osioita. Henkilö-, asiakirja- ja äänestysmäärät ovat dynaamisia. Puuttuvassa/latautuvassa/virheellisessä aineistossa teksti korvautuu kyseisen tilan kuvauksella. Mallin päivämäärä ja virallisen lopputuloksen sanamuoto vastaavat aineistoa.

Tietoiset erot: yhteinen header säilyy etusivun mukaisena; Trace-mallin ylimääräistä hakukuvaketta ei lisätty. Viimeinen vaihe on ”Toinen käsittely päättyi”, jotta 2K-koodi ei yksin merkitse hyväksymistä. Kokonaiset alkuperäiset fraasit ovat mallin lyhyitä kuvauksia pidempiä. Eduskunnan asiasanalinkit lisättiin lähdesarakkeen jatkoksi, koska ne avaavat toteutetun aihepolun. Toimitukselliset lyhyet otsikot erotetaan alkuperäisistä lähdeteksteistä avattavissa tiedoissa. Mobiili on saman järjestelmän jatko.

Toteutus on varmennettu mallikuvia vasten tekstin, rakenteen, typografian, värien, ikonien ja responsiivisen käyttäytymisen osalta. Jäljelle jäävät erot ovat yllä kuvattuja aineiston ja toimivan tutkimuspolun vaatimia eroja sekä IAB-kuvakaappauksen rajoitus.

## Tarkistetut käyttöpolut

- Haku ”asumistuki” → 7 tulosta → asia → 5 äänestystä → ”Lausumaehdotus, mietintö / Hanna-Leena Mattila 1” → henkilöäänen haku ”Purra” → yksi Jaa-ääni → Riikka Purran profiili → viisi tuodun asian ääntä.
- Valintasuodatin ”Ei” yhdessä Purra-haun kanssa → 0/199 tulosta; rajauksen poistaminen palauttaa henkilön äänen.
- Aikajana → kaikki 68 vaihetta → takaisin neljään keskeiseen vaiheeseen.
- Henkilörekisteri → 200 nykyistä tietuetta → seuraavat 50 (51–100) → Entinen + ”Halonen” → viisi nimiosumaa.
- Aihe ”asumistuki” → yksi viralliseen asiasanaan perustuva asia → HE-asiakirja → 67 527 merkin kokoteksti → lähde, noutopäivä ja lisenssi.
- Profiilin jäsenyydet → alku-/loppupäivät; puhelista ilman tuotuja puheita → rajattu tyhjä tila, ei väitettä puhumattomuudesta.
- Tuomaton henkilö-ID → 404-tila → takaisin tutkimaan. Käyttöliittymä sisältää erikseen lataus-, yhteysvirhe- ja uusintatilat; yhteysvirheen manuaalista verkkokatkoa ei simuloitu.
- Desktop, 390px mobiili ja IAB:n normaali paneelileveys; mobiilin sivuilla ei sivun laajuista vaakaylivuotoa. Pitkä äänestystaulukko vierii erikseen.

## Koodin ja tuonnin varmennus

12 `node --test` -testiä läpi. `npm run check`, `npm run build` ja `git diff --check` läpi. Kokonainen live-tuonti atomisella kirjoituksella onnistui 2.10.2026: 2 677 henkilötietuetta, viisi asiakirjaa, viisi äänestystä ja 995 henkilöääntä. Muistissa tehtävän keruun tai myöhemmän transaktion virhe säilyttää aiemman toimivan aineiston; tämä tarkistetaan erillisellä testillä.

Rajaukset: yksi kokonainen asia, kaksi erillistä puhehaun näytettä. Äänestysvaihtoehtojen tekstejä ei vielä poimita asiakirjoista. Finlex, avoimuusrekisteri ja vaalirahoitus eivät ole käyttöliittymässä. Aineiston ajastus, poistuneet tietueet ja keskeytyneiden ajojen tunnistaminen ovat jatkotyötä ennen julkista jatkuvaa palvelua.
