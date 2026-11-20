# Mission Island design

Mission Island is a two-player, third-person island game. Players can tackle shared service missions or spend a session fishing, tending the farm, and visiting Seabrook. The browser and LAN host give both players a short loop for building and playtesting together.

## Feel and art direction

Aim for a quaint and comforting island. Give props generous shapes, warm colors, and a few recognizable details. A chest latch, a striped market awning, a rod bending toward a bobber, or carrot tops showing above the soil should tell players what they can do. From island view, preserve the compact toy-scale silhouettes and keep landmarks easy to read.

Ground the game in simple physical behavior. Crates have weight, boats drift after paddling, and the dock holds a player above the water. Keep recovery easy. Missed throws can be picked up, fishing attempts can be repeated, and crops grow while both players explore. Use shared meshes, simple geometry, and inexpensive motion for background life so the game stays responsive on the LAN.

## Play loops

- **Service shifts.** Work together to deliver harbor crates and put out the lookout fire. After the starter shift, the harbor board offers repeat deliveries to new destinations and market orders for fish and crops. Choosing an order leaves the crew in the world where they were already playing.
- **Island life.** Take tools from the chest outside your starting house. Fish from the shore, dock, or skiff, or use the shared farm to grow carrots. Sell your catch and crops at Seabrook Market.
- **Progression.** Farming, fishing, and truck deliveries provide the first income. Each starter crate earns two coins per crew member, with three more for finishing the delivery and four for clearing the lookout fire. Market earnings and crew pay buy seeds and the Harbor angler uniform. Service missions also unlock the delivery and fire uniforms. Completed orders count toward the shared second-island milestone independently of coin balances.

The [roadmap](roadmap.md) records the playtest ideas and future jobs.

## Mechanics

- [Inventory and starter chests](mechanics/inventory.md)
- [Charged throws](mechanics/throwing.md)
- [Fishing and cast timing](mechanics/fishing.md)
- [Farming and the market](mechanics/farming-and-market.md)
- [Crew orders and second-island progress](mechanics/crew-orders.md)

Keep tuning values in the mechanic specification when they change. Update the mechanic's playtest cases when interaction rules or the multiplayer state change.
