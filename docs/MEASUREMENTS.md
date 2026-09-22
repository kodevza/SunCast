# Obliczenia produkcji i prognozy

SunCast wylicza produkcję dla **zaznaczonych i poprawnie rozwiązanych połaci dachu**. Wyniki dla wielu zaznaczonych połaci są sumowane. Moc instalacji (`kWp`) musi być ustawiona dla każdej połaci, która ma wejść do obliczeń.

## Prognoza na wybrany dzień

Moduł prognozy pobiera z Open-Meteo godzinowe natężenie promieniowania na płaszczyźnie nachylonej zgodnie z azymutem i kątem dachu. Dla każdej połaci prognozowana moc jest obliczana w przybliżeniu jako:

```text
prognozowana moc [kW] = promieniowanie [W/m²] × moc instalacji [kWp] / 1000
```

Następnie wartości wszystkich zaznaczonych połaci są agregowane w jeden profil godzinowy. Prognoza i jej daty są obsługiwane w strefie **UTC**.

Aplikacja udostępnia następujące wyniki z forecastu:

| Wynik | Jednostka | Stan w aplikacji |
| --- | --- | --- |
| Produkcja dla konkretnej godziny | kW | Dostępna jako punkt godzinowego wykresu prognozy. Wartość dla bieżącej godziny można odczytać z punktu odpowiadającego tej godzinie UTC. Nie ma jeszcze oddzielnego wskaźnika „produkcja teraz”. |
| Łączna prognozowana produkcja dobowa | kWh | Wyświetlana jako `Total energy`. Jest sumą godzinowych wartości mocy, traktowanych jako jednogodzinne interwały. |
| Maksymalna dzisiejsza produkcja | kW oraz godzina | Wyświetlana jako `Peak`: najwyższy punkt prognozy w wybranym dniu wraz z godziną UTC. |
| Profil produkcji w ciągu dnia | kW | Wykres godzinowy `Estimated PV output`, zsumowany dla zaznaczonych połaci. |

„Dzisiejsza” oznacza tu dzień ustawiony w kontrolce daty/czasu, a nie automatycznie lokalny dzień urządzenia. Aby otrzymać prognozę na dziś, należy wybrać dzisiejszą datę i odczytywać godziny w UTC.

## Inne obliczenia produkcyjne

Poza forecastem aplikacja udostępnia również:

- dobowy profil produkcji w warunkach modelowych, wraz z maksymalną mocą i godziną maksimum;
- miesięczne wartości produkcji dla zaznaczonych połaci, w tym serię z PVGIS, gdy usługa jest dostępna;
- roczne, próbkowane oszacowanie energii PV (`Overall PV`);
- geometrię dachu: nachylenie, azymut oraz zakres wysokości;
- podgląd bieżącego zacienienia i roczną symulację dostępu do słońca.

## Założenia i ograniczenia

- Wyniki są estymacją, a nie odczytem z falownika ani pomiarem rzeczywistej produkcji.
- Forecast zależy od dostępności Open-Meteo. Błąd dostawcy nie blokuje edycji projektu; panel prognozy pokazuje stan niedostępności.
- Dane forecastu są pobierane osobno dla każdej połaci. Gdy prognoza nie powiedzie się dla choć jednej z zaznaczonych połaci, panel przechodzi do komunikatu o niedostępności zamiast prezentować częściową sumę.
- Wyniki forecastu są danymi pochodnymi i nie są zapisywane jako źródło prawdy projektu.
- Model wykorzystuje zadaną moc `kWp`, geometrię połaci oraz prognozowane promieniowanie; nie uwzględnia telemetrii instalacji, awarii, zabrudzenia paneli ani szczegółowych strat systemowych.
