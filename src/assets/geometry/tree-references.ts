// Reference photographs behind each Highwood species, kept beside the species tables so a
// model can be reopened next to the photo it was shaped from. Keys are species ids from the
// catalog. Each photo is a Wikimedia Commons file page; check its licence before reuse.
// `exposure` marks a photo for one exposure only; the Workbench prefers a matching one.

interface TreeReference {
  readonly photo: string
  readonly licence: string
  readonly author: string
  // What to compare, shown as the photo's description in the Workbench reference pane.
  readonly shows: string
  readonly exposure?: 'sheltered' | 'exposed'
}

const commons = 'https://commons.wikimedia.org/wiki/File:'

export const treeReferences: Readonly<Record<string, readonly TreeReference[]>> = {
  'scots-pine': [
    { photo: `${commons}Scots_Pine_and_heather_in_Glen_Affric_-_geograph.org.uk_-_8131592.jpg`, licence: 'CC BY-SA 2.0', author: 'Julian Paren', shows: 'Upright Caledonian pines with clumped foliage pads and bare lower trunks.', exposure: 'sheltered' },
    { photo: `${commons}Windgestriemde_vliegdennen_(Pinus_sylvestris)._Locatie,_Schaopedobbe_(Schapenpoel)_02.jpg`, licence: 'CC BY-SA 4.0', author: 'Dominicus Johannes Bergsma', shows: 'Wind-bent pines leaning one way with crowns swept downwind.', exposure: 'exposed' },
  ],
  'birch': [
    { photo: `${commons}Wandeling_over_het_Hulshorsterzand_006.jpg`, licence: 'CC BY-SA 4.0', author: 'Agnes Monkelbaan', shows: 'Multi-stemmed birch with pale stems fanning into a light crown.' },
  ],
  'aspen': [
    { photo: `${commons}Populus_tremula_007.jpg`, licence: 'CC BY 2.5', author: 'Willow', shows: 'Whole aspen with straight pale stems and a rounded crown set high.' },
  ],
  'rowan': [
    { photo: `${commons}Rowan_tree_20081002b.jpg`, licence: 'CC BY-SA 3.0', author: 'Eeno11', shows: 'Short trunk splitting low into spreading limbs, crown heavy with berries.' },
  ],
  'alder': [
    { photo: `${commons}Alnus_glutinosa_Ząbki.JPG`, licence: 'CC BY-SA 3.0', author: 'Crusier', shows: 'Single trunk under a dense rounded-oval crown.' },
  ],
  'willow': [
    { photo: `${commons}20190319_Salix_cinerea_1.jpg`, licence: 'CC0', author: 'AnRo0002', shows: 'Many stems from the base under a domed shrub crown, seen leafless.' },
  ],
  'pine-snag': [
    { photo: `${commons}Dead_Tree_(4882785969).jpg`, licence: 'CC BY-SA 2.0', author: 'Timo Newton-Syms', shows: 'Bleached dead pine with a broken top and bare branch stubs.' },
  ],
  'deadfall-log': [
    { photo: `${commons}Sankt_Bartholomä,_umgewehter_Baum,_1.jpeg`, licence: 'CC0', author: 'Renardo la vulpo', shows: 'Upright root plate with soil beside the fallen trunk (a broadleaf, not a pine).' },
  ],
  'juniper': [
    { photo: `${commons}A_juniper_bush_at_Figsbury_Ring.jpg`, licence: 'CC BY-SA 4.0', author: 'Richard Avery', shows: 'A single spreading juniper with an irregular, drooping mass.' },
  ],
  'heather': [
    { photo: `${commons}Calluna_vulgaris_Habitus_2010-4-02_SierraMadrona.jpg`, licence: 'CC BY-SA 3.0', author: 'Javier martin', shows: 'A dense, domed, flowering heather cushion.' },
  ],
  'bilberry': [
    { photo: `${commons}Bilberry_bush_and_moss_in_Gullmarsskogen_ravine.jpg`, licence: 'CC0', author: 'W.carter', shows: 'A bilberry plant with thin green branching stems and small leaves.' },
  ],
  'bracken': [
    { photo: `${commons}Bracken_fronds_-_geograph.org.uk_-_7901601.jpg`, licence: 'CC BY-SA 2.0', author: 'Richard Sutcliffe', shows: 'Autumn bracken fronds showing the divided blade (a close-up, not a stand).' },
  ],
  'pine-sapling': [
    { photo: `${commons}Pine_sapling_on_Lysekil_line.jpg`, licence: 'CC0', author: 'W.carter', shows: 'A small bushy pine seedling with radiating needle tufts.' },
  ],
  'birch-sapling': [
    { photo: `${commons}Silver_birch_sapling,_Ballimore_-_geograph.org.uk_-_4921558.jpg`, licence: 'CC BY-SA 2.0', author: 'Alan O\'Dowd', shows: 'A lone birch sapling with a slender pale stem and sparse branching.' },
  ],
}
