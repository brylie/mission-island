// The road designer panel's markup. Classes, not ids, so the panel stands alone; the
// few ids name what labels and buttons point at, and only one panel exists at a time.
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
      <button type="button" class="road-new">New road</button>
      <button type="button" class="road-delete" data-needs-road>Delete road</button>
    </div>
    <div class="road-toolbar">
      <label>Name <input class="road-name" data-needs-road maxlength="80" /></label>
      <label>Kind <select class="road-kind" data-needs-road>${kindOptions}</select></label>
      <label title="Steepest grade allowed on the stretch after the selected dot; empty uses the kind's limit">Stretch limit (%) <input class="road-grade" type="number" min="1" max="40" step="1" /></label>
    </div>
    <div class="road-map-surface">
      <canvas class="road-map-base" aria-hidden="true"></canvas>
      <canvas class="road-map-overlay" tabindex="0" aria-label="Road layout over the island map" aria-describedby="road-help"></canvas>
    </div>
    <p id="road-help" class="road-help">Click to add a dot at the nearer end of the selected road. Drag a dot to move it, or the small handle in a stretch's middle to bend it. Double-click a road to add a dot there. Drag empty ground to pan, scroll to zoom. Delete removes the selected dot; Cmd or Ctrl+Z undoes.</p>
    <div class="road-toolbar">
      <button type="button" class="road-suggest">Suggest route to next dot</button>
      <button type="button" class="road-delete-dot">Delete dot</button>
      <button type="button" class="road-undo">Undo</button>
      <button type="button" class="road-redo">Redo</button>
    </div>
    <figure class="road-section-figure">
      <canvas class="road-section" aria-label="Long section: natural ground and road height along the selected road, with cut in orange and fill in blue"></canvas>
      <figcaption>Long section: ground (green), road (dark), cut (orange), fill (blue).</figcaption>
    </figure>
    <ul class="road-warnings" aria-label="Problems along the road"></ul>
    <div class="road-toolbar">
      <button type="button" class="road-save">Save to source</button>
      <button type="button" class="road-download">Download</button>
      <button type="button" class="road-discard">Discard draft</button>
    </div>
    </div>
    <p class="road-status" role="status"></p>`
}
