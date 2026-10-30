/* FRZFRM Weather Catch: the animals.
   Which animals can be caught, which row of the animal shelf they live on, how rare they are, and the five homes each
   one can turn up in: everyday first, its favourite last. Nothing in here touches the page. */
(function (root) {
  'use strict';
  var WC = root.WC = root.WC || {};
  var RU = WC.rules;

  var ROWS = [
    { id: 'garden', name: 'Garden', noun: 'garden animal' },
    { id: 'coast', name: 'Beach & Coast', noun: 'beach animal' },
    { id: 'country', name: 'Countryside', noun: 'countryside animal' },
    { id: 'zoo', name: 'Zoo', noun: 'zoo animal' }
  ];
  /* points by how rare an animal is in real life. Common animals are worth few, so levelling up from seagulls is slow;
     zoo animals are worth the most, as most people only visit a zoo a few times a year */
  var POINTS = { common: 5, uncommon: 15, rare: 40, epic: 100 };
  var COOLDOWN = 30 * 60000; // each animal can be caught once every 30 minutes
  var REPEAT = 0.2;           // catching the same animal again the same day earns a fifth

  /* id, name, row, rarity, a line about it, then its five homes, everyday first and its favourite last */
  var LIST = [
    ['ladybird', 'Ladybird', 'garden', 'uncommon', 'Lucky if it lands on you.', ['Leaf Bed', 'Thimble Tea Room', 'Button Sofa', 'Dolls’ House Kitchen', 'Fairy-light Treehouse']],
    ['bee', 'Bee', 'garden', 'common', 'Busy, busy, busy.', ['Flower Shop', 'Honeycomb Kitchen', 'Garden Tea Party', 'Sweet Shop', 'Honey Palace']],
    ['butterfly', 'Butterfly', 'garden', 'common', 'Never sits still for a photo.', ['Window Seat', 'Greenhouse', 'Art Studio', 'Dance Studio', 'Butterfly Ballroom']],
    ['robin', 'Robin', 'garden', 'uncommon', 'Follows the gardener for worms.', ['Garden Shed', 'Kitchen Table', 'Reading Nook', 'Little Post Office', 'Christmas Fireside']],
    ['bluetit', 'Blue Tit', 'garden', 'uncommon', 'First to the bird feeder, every time.', ['Nest-box Bedroom', 'Breakfast Table', 'Bubble Bath', 'Music Room', 'Peanut Café']],
    ['squirrel', 'Squirrel', 'garden', 'uncommon', 'Forgets where it buried half its nuts.', ['Tree Den', 'Pantry', 'Bakery', 'Library', 'Acorn Treehouse']],
    ['hedgehog', 'Hedgehog', 'garden', 'rare', 'Out after dark, snuffling in the hedge.', ['Garden Shed', 'Cosy Kitchen', 'Reading Nook', 'Cottage Bedroom', 'Fireside Armchair']],

    ['seagull', 'Seagull', 'coast', 'common', 'Keep an eye on your chips.', ['Rooftop Loft', 'Beach Hut', 'Pier Arcade', 'Lighthouse Room', 'Fish and Chip Shop']],
    ['crab', 'Crab', 'coast', 'uncommon', 'Walks sideways, and proud of it.', ['Rock Pool Room', 'Bucket House', 'Sandcastle Hall', 'Shell Shop', 'Shipwreck Cabin']],
    ['starfish', 'Starfish', 'coast', 'rare', 'Five arms, no brain, no problem.', ['Rock Pool Room', 'Seaside Bathroom', 'Aquarium Lounge', 'Seaside Bedroom', 'Star Observatory']],
    ['jellyfish', 'Jellyfish', 'coast', 'rare', 'Look, but don’t touch.', ['Fish Tank Lounge', 'Bathtub', 'Lava-lamp Den', 'Glass Ballroom', 'Night Disco']],
    ['seal', 'Seal', 'coast', 'rare', 'Bobbing up to see who’s there.', ['Beach Hut', 'Seaside Bathroom', 'Boathouse', 'Ice Rink', 'Swimming Pool']],
    ['puffin', 'Puffin', 'coast', 'epic', 'A beak full of fish and a face full of colour.', ['Cliff-top Burrow', 'Lighthouse Room', 'Fishing Hut', 'Seaside Café', 'Captain’s Cabin']],

    ['fox', 'Fox', 'country', 'rare', 'Trots through at dusk like it owns the place.', ['Hedge Den', 'Farmhouse Kitchen', 'Woodland Cabin', 'Library', 'Fairy-light Den']],
    ['rabbit', 'Rabbit', 'country', 'uncommon', 'One moment it’s there, the next it’s not.', ['Burrow Bedroom', 'Allotment Shed', 'Carrot Kitchen', 'Magic Show', 'Wonderland Tea Party']],
    ['deer', 'Deer', 'country', 'rare', 'Stand very still and it might not run.', ['Forest Cabin', 'Stately Hall', 'Mossy Library', 'Snowy Lodge', 'Christmas Grotto']],
    ['cow', 'Cow', 'country', 'common', 'Chewing. Always chewing.', ['Barn', 'Farmhouse Kitchen', 'Milk Bar', 'Cosy Sofa', 'Ice Cream Parlour']],
    ['sheep', 'Sheep', 'country', 'common', 'Counting them is meant to help you sleep.', ['Barn', 'Knitting Room', 'Bedroom', 'Woolly Jumper Shop', 'Cloud Bedroom']],
    ['swan', 'Swan', 'country', 'uncommon', 'Calm on top, paddling hard underneath.', ['Boathouse', 'Lakeside Cottage', 'Ballet Studio', 'Grand Ballroom', 'Royal Palace']],
    ['duck', 'Duck', 'country', 'common', 'Will do anything for a bit of bread. Peas are better for it.', ['Pond Cabin', 'Kitchen', 'Laundry Room', 'Boathouse', 'Bubble Bath']],

    ['lion', 'Lion', 'zoo', 'epic', 'Sleeps about 20 hours a day.', ['Safari Tent', 'Sunny Lounge', 'Library', 'Castle Hall', 'Throne Room']],
    ['tiger', 'Tiger', 'zoo', 'epic', 'No two have the same stripes.', ['Jungle Lodge', 'Bamboo Kitchen', 'Yoga Studio', 'Treehouse', 'Palace Garden']],
    ['elephant', 'Elephant', 'zoo', 'epic', 'Never forgets.', ['Living Room', 'Big Kitchen', 'Library', 'Music Room', 'Bubble Bathhouse']],
    ['giraffe', 'Giraffe', 'zoo', 'epic', 'Ducks under every door.', ['High Loft', 'Treetop Kitchen', 'Tall Library', 'Lighthouse Room', 'Stargazing Tower']],
    ['penguin', 'Penguin', 'zoo', 'epic', 'Dressed for dinner, every day.', ['Igloo', 'Fish Kitchen', 'Ice Rink', 'Snowy Lodge', 'Ice Palace']],
    ['meerkat', 'Meerkat', 'zoo', 'epic', 'Always on the lookout.', ['Burrow Den', 'Sandy Kitchen', 'Lookout Post', 'Safari Tent', 'Observatory']],
    ['flamingo', 'Flamingo', 'zoo', 'epic', 'Pink from the shrimp it eats.', ['Lagoon Lounge', 'Pink Kitchen', 'Ballet Studio', 'Pool Party', 'Grand Ballroom']]
  ];
  var TYPES = {}, ORDERED = [];
  LIST.forEach(function (a, i) {
    var t = { id: a[0], name: a[1], row: a[2], r: a[3], line: a[4], homes: a[5], order: i };
    TYPES[t.id] = t;
    ORDERED.push(t);
  });
  function type(id) { return TYPES[id] || null; }
  function points(id) { var t = TYPES[id]; return t ? POINTS[t.r] : 0; }
  function rank(id) { var t = TYPES[id]; return t ? RU.RARITY[t.r].rank : 0; }
  function rowTypes(row) { return ORDERED.filter(function (t) { return t.row === row; }); }

  /* ---------- homes ----------
     Every catch after the first turns up in one of its animal's five homes, at published odds that add up to exactly 1.
     The first catch of an animal always moves into its everyday home. */
  var HOME_SLOTS = [['h1', 12, '1 in 2'], ['h2', 6, '1 in 4'], ['h3', 3, '1 in 8'], ['h4', 2, '1 in 12'], ['h5', 1, '1 in 24']];
  var HRANK = { h1: 0, h2: 1, h3: 2, h4: 3, h5: 4 };
  function homes(id) {
    var t = TYPES[id];
    if (!t) return [];
    return HOME_SLOTS.map(function (s, i) {
      return { id: s[0], name: t.homes[i], odds: s[2], chance: s[1] / 24, pct: RU.pctText(s[1] / 24), fav: s[0] === 'h5', rank: i };
    });
  }
  function home(id, h) {
    var list = homes(id);
    for (var i = 0; i < list.length; i++) if (list[i].id === h) return list[i];
    return list[0] || null;
  }
  function homeRank(h) { return HRANK[h] || 0; }
  /* r: a random number from 0 up to 1. The rarest home takes the lowest numbers */
  function rollHome(r) {
    var k = Math.floor(r * 24), acc = 0;
    for (var i = HOME_SLOTS.length - 1; i > 0; i--) { acc += HOME_SLOTS[i][1]; if (k < acc) return HOME_SLOTS[i][0]; }
    return 'h1';
  }
  /* ---------- the animal shelf ---------- */
  var ROW_BONUS = 250;
  function progress(book) {
    book = book || {};
    var have = 0;
    var rows = ROWS.map(function (r) {
      var list = rowTypes(r.id), n = 0, gold = 0;
      list.forEach(function (t) { var e = book[t.id]; if (e && e.n > 0) n += 1; if (e && e.n >= RU.GOLD_AT) gold += 1; });
      have += n;
      return { row: r.id, name: r.name, need: list.length, have: n, gold: gold, complete: n === list.length };
    });
    return { have: have, total: ORDERED.length, rows: rows };
  }

  WC.animals = {
    ROWS: ROWS, TYPES: TYPES, ORDERED: ORDERED, POINTS: POINTS, COOLDOWN: COOLDOWN, REPEAT: REPEAT, ROW_BONUS: ROW_BONUS,
    type: type, points: points, rank: rank, rowTypes: rowTypes, homes: homes, home: home, homeRank: homeRank, rollHome: rollHome,
    HOME_SLOTS: HOME_SLOTS.map(function (s) { return s[0]; }), progress: progress,
    rowName: function (id) { var r = ROWS.filter(function (x) { return x.id === id; })[0]; return r ? r.name : ''; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
