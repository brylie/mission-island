# Forest Lookout recovery

Finish the starter delivery, collect an extinguisher at Fire Supplies, and walk up the gravel trail. When the crew puts out the fire, visit the ash beside the trail end. Return after the first dawn to look for shoots, and after the third for fuller regrowth. The brass scope at (5.42, 32.6) is a reference point on each visit.

## Matched Workbench views

Run Vite from this branch on the default port. Open one of the views below or choose **Landscape Workbench → Scenic view → Forest Lookout recovery**. The study shows all visits from the same camera and a paused frame at 2.4 seconds.

| Visit | What to look for |
| --- | --- |
| [Active fire](http://localhost:5173/workbench.html#lookout-recovery?setup=%7B%22version%22%3A1%2C%22name%22%3A%22Forest%2BLookout%2Brecovery%22%2C%22camera%22%3A%7B%22alpha%22%3A-1.02%2C%22beta%22%3A1.08%2C%22radius%22%3A10.2%2C%22fov%22%3A0.72%2C%22target%22%3A%5B5.55%2C0.42%2C29.7%5D%7D%2C%22time%22%3A2.4%2C%22options%22%3A%7B%22visit%22%3A%22incident%22%7D%2C%22grid%22%3Afalse%2C%22wireframe%22%3Afalse%7D&light=daylight&stage=island) | The original objective burns at the trail end. |
| [Just extinguished](http://localhost:5173/workbench.html#lookout-recovery?setup=%7B%22version%22%3A1%2C%22name%22%3A%22Forest%2BLookout%2Brecovery%22%2C%22camera%22%3A%7B%22alpha%22%3A-1.02%2C%22beta%22%3A1.08%2C%22radius%22%3A10.2%2C%22fov%22%3A0.72%2C%22target%22%3A%5B5.55%2C0.42%2C29.7%5D%7D%2C%22time%22%3A2.4%2C%22options%22%3A%7B%22visit%22%3A%22ash%22%7D%2C%22grid%22%3Afalse%2C%22wireframe%22%3Afalse%7D&light=daylight&stage=island) | Damp ash and flattened grass mark the two verges beside the trail. |
| [First dawn](http://localhost:5173/workbench.html#lookout-recovery?setup=%7B%22version%22%3A1%2C%22name%22%3A%22Forest%2BLookout%2Brecovery%22%2C%22camera%22%3A%7B%22alpha%22%3A-1.02%2C%22beta%22%3A1.08%2C%22radius%22%3A10.2%2C%22fov%22%3A0.72%2C%22target%22%3A%5B5.55%2C0.42%2C29.7%5D%7D%2C%22time%22%3A2.4%2C%22options%22%3A%7B%22visit%22%3A%22shoots%22%7D%2C%22grid%22%3Afalse%2C%22wireframe%22%3Afalse%7D&light=daylight&stage=island) | Short green shoots appear along the margins while the centre stays bare. |
| [Third dawn](http://localhost:5173/workbench.html#lookout-recovery?setup=%7B%22version%22%3A1%2C%22name%22%3A%22Forest%2BLookout%2Brecovery%22%2C%22camera%22%3A%7B%22alpha%22%3A-1.02%2C%22beta%22%3A1.08%2C%22radius%22%3A10.2%2C%22fov%22%3A0.72%2C%22target%22%3A%5B5.55%2C0.42%2C29.7%5D%7D%2C%22time%22%3A2.4%2C%22options%22%3A%7B%22visit%22%3A%22established%22%7D%2C%22grid%22%3Afalse%2C%22wireframe%22%3Afalse%7D&light=daylight&stage=island) | The same shoots have grown taller. New grass and small flowers surround the old charred twigs. |

[Steam just after the extinguisher stops](http://localhost:5173/workbench.html#lookout-recovery?setup=%7B%22version%22%3A1%2C%22name%22%3A%22Forest%2BLookout%2Brecovery%22%2C%22camera%22%3A%7B%22alpha%22%3A-1.02%2C%22beta%22%3A1.08%2C%22radius%22%3A10.2%2C%22fov%22%3A0.72%2C%22target%22%3A%5B5.55%2C0.42%2C29.7%5D%7D%2C%22time%22%3A0.95%2C%22options%22%3A%7B%22visit%22%3A%22ash%22%7D%2C%22grid%22%3Afalse%2C%22wireframe%22%3Afalse%7D&light=daylight&stage=island) uses the same camera at 0.95 seconds. Press **Play** to see the steam clear.

## Host and walking checks

The host records the current island time when extinguishing succeeds. Recovery counts dawns crossed since that event. Older completed saves use the established appearance. An active incident takes precedence until the fire is extinguished again.

The two-client harness picked up an extinguisher at Fire Supplies, walked into spraying range, and completed the incident. Both clients derived the same ash stage. The host saved and reloaded the timestamp, then advanced to dawn when both players turned in. Both clients derived the shoots stage, which also survived a fresh host restart. The harness also checked that both clients see established growth on crossing the third dawn, and walked an observer to the brass scope through the damp-ash stage. The terrain checks cover the supplies, trail, and objective. The new growth is low scenery beyond the trail edge. A live playtest with two human players is still pending.

[Forest Lookout recovery #46](https://github.com/brylie/mission-island/issues/46) · [Fire and rescue #12](https://github.com/brylie/mission-island/issues/12)
