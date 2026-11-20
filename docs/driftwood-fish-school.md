# Driftwood and Sandspit fish schools

Run `npm ci` and `npm run dev` from this branch to use the playtest links.

## Fixed-camera replay

- [Two crossings from the east, with trails and leader marker](http://localhost:5173/workbench.html#fish-school?setup=%7B%22version%22%3A1%2C%22name%22%3A%22Fish%20schooling%20trial%22%2C%22camera%22%3A%7B%22alpha%22%3A1.57%2C%22beta%22%3A0.19%2C%22radius%22%3A20.7%2C%22fov%22%3A0.72%2C%22target%22%3A%5B0%2C0%2C0%5D%7D%2C%22time%22%3A0%2C%22options%22%3A%7B%22actor%22%3A%22skiff%22%2C%22side%22%3A%22east%22%2C%22returnPass%22%3Atrue%2C%22seed%22%3A42%2C%22route%22%3A%22%5B%5D%22%2C%22nudge%22%3Afalse%2C%22trails%22%3Atrue%2C%22leaderRing%22%3Atrue%7D%2C%22grid%22%3Afalse%2C%22wireframe%22%3Afalse%7D&light=daylight)
- [Same run with trails, startle colors, and leader marker hidden](http://localhost:5173/workbench.html#fish-school?setup=%7B%22version%22%3A1%2C%22name%22%3A%22Fish%20schooling%20trial%22%2C%22camera%22%3A%7B%22alpha%22%3A1.57%2C%22beta%22%3A0.19%2C%22radius%22%3A20.7%2C%22fov%22%3A0.72%2C%22target%22%3A%5B0%2C0%2C0%5D%7D%2C%22time%22%3A0%2C%22options%22%3A%7B%22actor%22%3A%22skiff%22%2C%22side%22%3A%22east%22%2C%22returnPass%22%3Atrue%2C%22seed%22%3A42%2C%22route%22%3A%22%5B%5D%22%2C%22nudge%22%3Afalse%2C%22trails%22%3Afalse%2C%22leaderRing%22%3Afalse%7D%2C%22grid%22%3Afalse%2C%22wireframe%22%3Afalse%7D&light=daylight)
- [Recorded comparison route, seed 9](http://localhost:5173/workbench.html#fish-school?setup=%7B%22version%22%3A1%2C%22name%22%3A%22Fish%20schooling%20trial%22%2C%22camera%22%3A%7B%22alpha%22%3A1.57%2C%22beta%22%3A0.19%2C%22radius%22%3A20.7%2C%22fov%22%3A0.72%2C%22target%22%3A%5B0%2C0%2C0%5D%7D%2C%22time%22%3A1.5%2C%22options%22%3A%7B%22actor%22%3A%22skiff%22%2C%22side%22%3A%22west%22%2C%22returnPass%22%3Afalse%2C%22seed%22%3A9%2C%22route%22%3A%22%5B%5B45%2C60%2C0%5D%2C%5B300%2C-20%2C20%5D%2C%5B455%2C-60%2C0%5D%5D%22%2C%22nudge%22%3Afalse%2C%22trails%22%3Atrue%2C%22leaderRing%22%3Atrue%7D%2C%22grid%22%3Afalse%2C%22wireframe%22%3Afalse%7D&light=daylight)

Press **Play**. In the east approach, two fish have startled by 3.6 seconds, fish 1 is leading at 8 seconds, and the returning skiff has scattered the school by 12.5 seconds. Fish 2 leads the next regroup. Use **First approach** to change sides. With a manually recorded route, the first recorded move takes over the skiff or wader.

The comparison recordings use the same camera, skiff route, seed, and 1.5–18.5 second interval. On base commit `9549b4f`, the skiff at the edge still disturbs the school briefly after the two passes. The updated trial treats the actor at the far edge as clear of the water and the school stays at two disturbances in that replay.

## In the islands

- [Driftwood Fish Shallows, Landscape Workbench](http://localhost:5173/workbench.html?view=driftwood-fish#landscape). The resting school starts near x 33.4 m, z −42.9 m. In the game, have one crewmate watch from the beach near x 33.4 m, z −37.9 m while another wades toward one flank. Back out, wait for the fish to gather, and repeat with the skiff. Before showing the Ecology overlay, ask which fish moved first and where they gathered.
- [Sandspit Fishing Pier, Saltwind preview](http://localhost:5173/second-island.html?view=1&at=-248.8,.179405,-265.2&eye=-244.8,6.4,-273&pose=3.141593,0,1,0,0,0&orbit=3.141593,.6,8,0&tour=0,0,0,0&time=0&site=fishing&weather=daylight). Resume and walk off the east bank beside the pier at x −248.8 m. Turn back toward shore to give the school space to regroup. The view link starts a seeded, undisturbed school. It carries the camera and time. Swimming history is local to the running preview.

The Starter host advances the Driftwood school every simulation tick and includes the same fish positions, startle states, and leader in each client's snapshot. A late joiner gets the current snapshot, without replaying past threats. The fish remain transient wildlife, so restarting the host still starts a fresh school. The save format and fishing jobs are unchanged.

## Checks

Automated checks cover wading and paddling with two clients, reconnect during the escape, a late observer after leader selection, a second crossing, multiple seeds, 24 and 60 Hz replay, a lone fish, two opposing threats, and the shoreline depths at both sites. Browser checks covered the staged Driftwood view, the Workbench comparison and the Sandspit swimmer view. A second human observer has yet to review the live encounter.
