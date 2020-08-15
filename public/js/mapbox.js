/* eslint-disable */
// console.log('Hello from the client side');

// This is a client side script

export const displayMap = (locations) => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoiYWRkeWxlYXJucyIsImEiOiJja2Q2cnExbXIwNGdpMnJubmNjOG51YWRvIn0.rvLQDvz6bIbn6cBTGx9opQ';
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/addylearns/ckd6utpy70ahs1inm8is5unap',
    //   zoom: 1,
    //   interactive: false,
    scrollZoom: false,
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    //Create Marker
    const el = document.createElement('div');
    el.className = 'marker'; // 'marker' is a css class designed by Jonas

    //Add Marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // Add pop up
    new mapboxgl.Popup({
      offset: 30,
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}:${loc.description}`)
      .addTo(map);

    // Extend map bounds to include a current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      //padding for the markers
      top: 200,
      bottom: 200,
      left: 100,
      right: 100,
    },
  });
};
