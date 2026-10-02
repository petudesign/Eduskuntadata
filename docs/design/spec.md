# Käyttöliittymän toteutusmalli

2.10.2026. Autonomisesti valittu toteutusmalli käyttäjän ”jatkamaan vaan” -ohjeen perusteella. Built-in Image Gen tuotti `home-concept.png`- ja `trace-concept.png`-mallit. Ne ovat suunnittelureferenssejä, eivät käyttöliittymän kuvia.

## Visuaalinen järjestelmä

- Valkoinen tausta `#ffffff`, tumma teksti `#23302a`, toissijainen teksti `#59635f`, vihreä käyttöliittymäaksentti `#245c48`, viiva `#d9e1dc`, huomautuspinta `#f1f5f2`. Aksentti osoittaa linkkejä ja valintaa; äänivalinnat erotetaan tekstillä.
- Times New Roman -serif otsikoissa ja brändin tekstissä. Alkuperäinen Georgia-arvio korjattiin kuvavertailussa: Times New Roman vastaa paremmin mallin kirjainten leveyttä ja muotoa. Arial / system sans-serif leipätekstissä ja säätimissä. Etusivun h1 72px, yksityiskohtanäkymän 60px, h2 40px, h3 26px, teksti 18px ja metatiedot 16px. Mobiilissa h1 38px, h2 28px.
- Etusivun referenssi 1435 × 1096; sisältö 1280px, sivuilla 76px. Header 78px; h1 alkaa noin y140. Hakukenttä 60px. Alaosan sarakkeet noin 840 / 370px, väli 70px. Näkymän mukaan sama 1280px ruudukko jatkuu.
- Yksi rajattu esimerkki, muuten avoimet listat, aikajana, taulukot ja lähderaili. Ei kuvia, kuvioita, gradientteja, pillimerkkejä tai korttiruudukkoa.
- Natiivit tekstilinkit, formit, selectit ja details-elementit. Ikonit: haku (ympyrä/varsi), nuoli oikealle, chevron alas/oikealle; 24px viewBox, 1.75px currentColor-viiva. Näkyvä fokus, 44px kosketuskohteet ja vähennetyn liikkeen tuki.

## Etusivun lukittu teksti

Eduskuntadata; Tutki; Edustajat; Aiheet; Päätökset; Lähteet; Löydä päätöksen tausta.; Tutki edustajia, äänestyksiä ja asiakirjoja. Tarkista tiedot alkuperäisestä lähteestä.; Mitä haluat tutkia?; Edustajan nimi, aihe tai asiakirjan tunnus; Hae; Kokeile:; asumistuki; Riikka Purra; HE 74/2023 vp; Aloita tästä asiasta; Yleisen asumistuen muutokset; Hallituksen esitys yleisestä asumistuesta annetun lain muuttamisesta.; Eduskunnan päätös: hyväksytty muutettuna; Avaa käsittelyketju; Katso, mistä äänestettiin; Jaa tai ei kertoo valinnasta kyseisessä äänestyksessä. Tarkista aina otsikko ja vaihtoehtojen asiayhteys.; Aineisto tässä versiossa; Nykyisiä ja entisiä edustajia. Henkilörekisterin määrä ei ole nykyisten kansanedustajien määrä.; Yhden asian käsittelyketju; Asumistukiesityksen asiakirjat ja äänestykset vuodelta 2023.; Katso lähteet ja kattavuus; Viralliset lähteet. Omat johtopäätökset.

Henkilö-, asiakirja- ja äänestysmäärät luetaan API:sta. Puuttuva aineisto korvaa esimerkin rehellisellä tyhjällä tilalla. Lyhyt asian otsikko on palvelun toimituksellinen nimike, alkuperäinen otsikko säilyy heti sen yhteydessä ja lähdetiedoissa.

## Ydintoiminnallisuus ja komponentit

- App kokoaa headerin, reitin ja footerin. Navigaatio käyttää tavallisia hyperlinkkejä, jolloin osoitteet, kirjanmerkit sekä takaisin/eteen toimivat ilman reititinkirjastoa.
- Home: haku, kokeilulinkit, yksi oikea asia ja kattavuus.
- Search/Browse: tyypitetyt tulokset, henkilörekisterin nykyinen/entinen-suodatin ja sivutus, aiheiden ja asioiden listat.
- Matter: neljä toimituksellisesti nimettyä keskeistä vaihetta lähteen koodeista ANTO, LK, VKP ja viimeisestä 2K-vaiheesta. Kaikki vaiheet ovat avattavissa. Henkilöiden motiiveja ei päätellä.
- Vote: kyseisen äänestyksen otsikko, lähteen luvut, henkilöäänet, nimihaku ja valintasuodatin. Vaihtoehtotekstien puuttuminen näkyy. Nimi linkittää profiiliin vain lähde-ID:n ollessa tuotu.
- Person: nimi, tila, ajalliset jäsenyydet, tuodut äänet ja puheet. Tyhjä aineisto ei tarkoita tekemättömyyttä.
- Evidence: tuottaja, aikaleima, lisenssi, lähde-URL, hakurungon tiedot ja tekniset tunnisteet progressive disclosure -periaatteella.
- Dokumentit renderöidään tekstinä. Lähteestä saatuja HTML-katkelmia ei suoriteta.

## Tietoiset erot referenssikuviin

Trace-kuvan ylimääräistä hakukuvaketta ei lisätä headeriin; etusivun lukittu yhteinen header pysyy yhtenäisenä. Käsittelyvaiheiden kuvaukset tulevat alkuperäisestä tekstistä kokonaisina, joten ne voivat olla kuvaa pidempiä. Viimeisen vaiheen otsikko on ”Toinen käsittely päättyi”, sillä pelkkä 2K-koodi ei kaikissa asioissa tarkoita lakiehdotuksen hyväksymistä. Otsikon nimeämistapa ja lähteen virallinen käsittelyvaihe näkyvät avattavissa lähdetiedoissa. Puuttuvat asiat/äänet ja API-virheet tuottavat omat tilat. Mobiili jatkaa samaa järjestystä yhtenä sarakkeena.
