let GENEDIVE_COLORS = ["#4dadf7","#ff8787","#748ffc","#ffd43b","#69db7c","#3bc9db","#38d9a9","#9775fa","#ffa94d","#da77f2","#a9e34b","#f783ac"];

class Color {
  
  constructor() {
    this.colormap = {};
    this.nextColor = 0;
  }  

  reset () {
    this.colormap = {};
    this.nextColor = 0;
  }

  getColor ( id ) {
    return this.colormap[id] || "#aaaaaa";
  }

  setColor ( ids, color ) {
    ids.forEach( id => this.colormap[id] = color );
  }

  allocateColor ( ids ) {
    let color = GENEDIVE_COLORS[ this.nextColor++ % GENEDIVE_COLORS.length ];
    this.setColor( ids, color );
    return color;
  }

  colorInteractions ( interactions ) {
    interactions.forEach( i => {
      i.mention1_color = this.colormap[i.geneids1] || "#aaaaaa";
      i.mention2_color = this.colormap[i.geneids2] || "#aaaaaa";
    });
    return interactions;
  }

}