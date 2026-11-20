# Brinewick Fish Market routine

In **Landscape Workbench → Scenic view → Brinewick Fish Market routine**, change **Market phase** and **Weather** without moving the camera. The four links open the same quay-facing view at 6.4 seconds. Run Vite from this branch on its default port to use them.

| Matched Workbench view | What to watch |
| --- | --- |
| [Dry setup](http://localhost:5173/workbench.html#brinewick-market-routine?setup=%7B%22version%22%3A1%2C%22name%22%3A%22Brinewick+Fish+Market%22%2C%22camera%22%3A%7B%22alpha%22%3A1.78%2C%22beta%22%3A1.32%2C%22radius%22%3A17.2%2C%22fov%22%3A0.69%2C%22target%22%3A%5B-247.15%2C10.55%2C-124.35%5D%7D%2C%22time%22%3A6.4%2C%22options%22%3A%7B%22phase%22%3A%22setup%22%2C%22weather%22%3A%22dry%22%7D%2C%22grid%22%3Afalse%2C%22wireframe%22%3Afalse%7D&light=daylight&stage=island) | Float net drying on the outer rack and empty trays on the worktable. |
| [Trading](http://localhost:5173/workbench.html#brinewick-market-routine?setup=%7B%22version%22%3A1%2C%22name%22%3A%22Brinewick+Fish+Market%22%2C%22camera%22%3A%7B%22alpha%22%3A1.78%2C%22beta%22%3A1.32%2C%22radius%22%3A17.2%2C%22fov%22%3A0.69%2C%22target%22%3A%5B-247.15%2C10.55%2C-124.35%5D%7D%2C%22time%22%3A6.4%2C%22options%22%3A%7B%22phase%22%3A%22trading%22%2C%22weather%22%3A%22dry%22%7D%2C%22grid%22%3Afalse%2C%22wireframe%22%3Afalse%7D&light=daylight&stage=island) | Fish in the display trays and a hanging catch board facing the approach. |
| [Closing](http://localhost:5173/workbench.html#brinewick-market-routine?setup=%7B%22version%22%3A1%2C%22name%22%3A%22Brinewick+Fish+Market%22%2C%22camera%22%3A%7B%22alpha%22%3A1.78%2C%22beta%22%3A1.32%2C%22radius%22%3A17.2%2C%22fov%22%3A0.69%2C%22target%22%3A%5B-247.15%2C10.55%2C-124.35%5D%7D%2C%22time%22%3A6.4%2C%22options%22%3A%7B%22phase%22%3A%22closing%22%2C%22weather%22%3A%22dry%22%7D%2C%22grid%22%3Afalse%2C%22wireframe%22%3Afalse%7D&light=daylight&stage=island) | Canvas covers over the trays and wicker baskets nested on the rack. Restart the timeline to watch the covers settle. |
| [Rainy setup](http://localhost:5173/workbench.html#brinewick-market-routine?setup=%7B%22version%22%3A1%2C%22name%22%3A%22Brinewick+Fish+Market%22%2C%22camera%22%3A%7B%22alpha%22%3A1.78%2C%22beta%22%3A1.32%2C%22radius%22%3A17.2%2C%22fov%22%3A0.69%2C%22target%22%3A%5B-247.15%2C10.55%2C-124.35%5D%7D%2C%22time%22%3A6.4%2C%22options%22%3A%7B%22phase%22%3A%22setup%22%2C%22weather%22%3A%22rain%22%7D%2C%22grid%22%3Afalse%2C%22wireframe%22%3Afalse%7D&light=daylight&stage=island) | The outer rack is empty. The same net hangs inside the awning and sways less than it does outdoors. |

Saltwind uses setup from 05:30 to 11:30, trading until 17:00, and the closing arrangement overnight. These are tuning values. The routine samples the current island weather and hour, so changing the clock or reopening a saved view produces the corresponding arrangement without a history of earlier frames. Host-controlled Saltwind travel and a multiplayer reconnect playtest depend on [#19](https://github.com/brylie/mission-island/issues/19).

## Work stops and delivery

| Work stop | Centre (X, Z) in metres | Footprint |
| --- | --- | --- |
| `fish-market-worktable` | −243.38, −124.75 | 3.40 × 1.02 m |
| `fish-market-outdoor-net-rack` | −252.20, −122.20 | 3.46 × 0.76 m |
| `fish-market-sheltered-net-rack` | −250.58, −125.32 | 3.46 × 0.76 m |

The closest fixture is 1.85 m from the centre of the 1.45 m storefront path. All fixtures sit at least 8.18 m west of the 21 × 33 m delivery apron, and none intrude on the 6.4 m approach lane. The flatbed turning envelope was checked against the apron dimensions. Only the permanent supports participate in walking collision.

Open the [rainy delivery approach](http://localhost:5173/second-island.html?view=1&at=-222.1%2C9.838888%2C-103&eye=-219.2%2C11.6%2C-96.2&pose=3.141593%2C0%2C1%2C0%2C0%2C0&orbit=3.141593%2C0.22%2C8.2%2C0&tour=0%2C0%2C0%2C0&time=0&site=fish-market&weather=live) in the Saltwind preview and walk forward to the bay at (−222, −125). The rainy playtest followed the lane from Z −103 past the marked bay to Z −133, then back into the bay. A separate pass followed the storefront path from (−249, −110) to the steps at (−247, −125) while the net was under the awning. Saltwind currently stages the bay for future deliveries, so this verifies access and turning clearance. Live truck driving and a cargo hand-in were outside the preview.

[Market routine #43](https://github.com/brylie/mission-island/issues/43) · [Market orders #21](https://github.com/brylie/mission-island/issues/21)
