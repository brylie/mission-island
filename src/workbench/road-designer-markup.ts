import { roadDesignerLook as look } from '../assets/recipes/workbench-roads'

// The road designer panel's markup. Classes, not ids, so the panel stands alone; the
// few ids name what labels and buttons point at, and only one panel exists at a time.

const percent = 100

// The grade legend under the map, from the same colours and thresholds the map uses.
function legend() {
  const swatch = (band: 'easy' | 'steady' | 'limit' | 'over', text: string) =>
    `<span class="road-legend-item"><span class="road-swatch road-swatch-${band}" style="--swatch: ${look.grade[band]}; --dash-on: ${look.road.overDash[0]}px; --dash-gap: ${look.road.overDash[1]}px" aria-hidden="true"></span>${text}</span>`
  const nearLimit = Math.round((1 - look.grade.nearLimitShare) * percent)
  return `<p class="road-legend">Grade:
    ${swatch('easy', `easy, under ${Math.round(look.grade.easyBelow * percent)}%`)}
    ${swatch('steady', 'steady')}
    ${swatch('limit', `near the limit, within ${nearLimit}% of it`)}
    ${swatch('over', 'over the limit, dashed')}
  </p>`
}

export function roadDesignerMarkup(kinds: readonly string[]) {
  const kindOptions = kinds.map((kind) => `<option value="${kind}">${kind.replace('-', ' ')}</option>`).join('')
  return `
    <header class="road-header">
      <h2 id="road-designer-title">Road designer</h2>
      <button type="button" class="road-collapse" aria-expanded="true" aria-controls="road-designer-body">Hide</button>
      <p class="road-summary" aria-live="polite"></p>
    </header>
    <div class="road-body" id="road-designer-body">
    <div class="road-toolbar">
      <label>Road <select class="road-select" data-needs-road></select></label>
      <button type="button" class="road-move-up" data-needs-road>Move up</button>
      <button type="button" class="road-move-down" data-needs-road>Move down</button>
    </div>
    <div class="road-toolbar">
      <button type="button" class="road-new">New road</button>
      <button type="button" class="road-delete" data-needs-road>Delete road</button>
      <label>Name <input class="road-name" data-needs-road maxlength="80" /></label>
      <label>Kind <select class="road-kind" data-needs-road>${kindOptions}</select></label>
    </div>
    <div class="road-toolbar">
      <label>Dot <select class="road-dot" data-needs-road></select></label>
      <label>Stretch limit (%) <input class="road-grade" type="number" min="${look.stretchLimitPercent.min}" max="${look.stretchLimitPercent.max}" step="1" aria-describedby="road-grade-hint" /></label>
      <span class="road-hint" id="road-grade-hint"></span>
    </div>
    <div class="road-map-surface">
      <canvas class="road-map-base" aria-hidden="true"></canvas>
      <canvas class="road-map-overlay" tabindex="0" aria-label="Road layout over the island map" aria-describedby="road-help"></canvas>
    </div>
    ${legend()}
    <p id="road-help" class="road-help">Click to add a dot at the nearer end of the selected road. Drag a dot to move it, or the small handle in a stretch's middle to bend it. Double-click a road to add a dot there. Drag empty ground to pan, scroll to zoom. With the map focused, arrow keys pan, + and − zoom, and Delete removes the selected dot. Pick a dot from the Dot list. Escape cancels New road; Cmd or Ctrl+Z undoes.</p>
    <div class="road-toolbar">
      <button type="button" class="road-suggest">Suggest route to next dot</button>
      <button type="button" class="road-delete-dot">Delete dot</button>
      <button type="button" class="road-undo">Undo</button>
      <button type="button" class="road-redo">Redo</button>
    </div>
    <figure class="road-section-figure">
      <canvas class="road-section" role="img" aria-label="Long section: natural ground and road height along the selected road, with cut in orange and fill in blue"></canvas>
      <figcaption>Long section: ground (brown line), road (black line), cut (orange), fill (blue). Hover it to mark the spot on the map.</figcaption>
      <p class="road-readout"></p>
    </figure>
    <ul class="road-warnings" aria-label="Problems along the road"></ul>
    </div>
    <footer class="road-footer">
      <div class="road-toolbar">
        <button type="button" class="road-save">Save to source</button>
        <button type="button" class="road-download">Download</button>
        <button type="button" class="road-discard">Discard draft</button>
      </div>
      <p class="road-status" role="status"></p>
    </footer>`
}
