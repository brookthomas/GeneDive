/* Interacts with the Controller-Search module */

/**
 @class      Search
 @brief      Interacts with the Controller-Search module
 @details
 @authors    Mike Wong mikewong@sfsu.edu
 Brook Thomas brookthomas@gmail.com
 Jack Cole jcole2@mail.sfsu.edu
 @callergraph
 */

class Search {

  constructor(input, topology, display, color) {
    this.input = $(input);
    this.topology = $(topology);
    this.display = $(display);
    this.color = color;
    this.graphsearch = new GraphSearch();
    this.sets = [];

    this.initTypeahead();

    alertify.set('notifier', 'position', 'top-left');

    this.topology.children("button").on("click", (event) => {
      this.topology.children("button").removeClass("active");
      $(event.currentTarget).addClass("active");

      this.input.val("");
      GeneDive.onSelectSearchType();
    });
  }

  selectedTopology() {
    let selected = this.topology.children("button.active");
    selected.tooltip('hide');
    return selected.attr("data-type");
  }

  /**
   @fn       Search.setTopology
   @brief    Selects the type of search programmatically
   @details  Will make the button of the specified data type active.
   @param   dataType Possible values: 1hop, 2hop, 3hop, clique
   @callergraph
   */
  setTopology(dataType) {
    $(`.search-module button`).removeClass("active");
    let button = $(`.search-module button[data-type=${dataType}]`);
    button.addClass("active");
  }

  addSearchSet(name, ids, deferRunSearch = false) {

    if (this.hasSearchSet(name)) {
      alertify.notify("Gene already in search.", "", "3");
      return;
    }

    switch (this.selectedTopology()) {

      case "clique":
        if (this.sets.length >= 1 || ids.length > 1) {
          alertify.notify("Clique searches are limited to a single gene.", "", "3");
          this.input.val("");
          return;
        }

        this.sets.push(new SearchSet(name, ids));
        break;

      case "1hop":
      case "2hop":
      case "3hop":
      default:
        this.sets.push(new SearchSet(name, ids));
        break;
    }

    this.renderDisplay();

    if (!deferRunSearch) {
      GeneDive.onAddDGD();
    }

  }

  removeSearchSet(identifier, deferRunSearch = false) {
    this.sets = this.sets.filter((set) => set.name != identifier && set.ids[0] != identifier);

    this.renderDisplay();

    if (!deferRunSearch) {
      GeneDive.onRemoveDGD();
    }
  }

  clearSearch() {
    this.sets = [];
    this.renderDisplay();
  }

  getIds(minProb) {


    this.color.reset();

    switch (this.selectedTopology()) {

      case "1hop":
        return this.search1Hop();

      case "2hop":
        if (this.sets.length === 1) {
          return [];
        }
        return this.search2Hop();

      case "3hop":
        if (this.sets.length === 1) {
          return [];
        }
        return this.search3Hop();

      case "clique":
        return this.searchClique(minProb);
    }
  }

  search1Hop() {
    // Generate colors and re-render display
    this.sets.forEach(s => {
      let color = this.color.allocateColor(s.ids);
      s.color = color;
    });
    this.renderDisplay();

    return _.flatten(this.sets.map(s => s.ids));
  }

  search2Hop() {
    let nhop = this.graphsearch.nHop(this.sets[0].ids[0], this.sets[1].ids[0], 2, false);

    // Re-render Search Display with Colors
    this.sets.forEach(s => {
      s.color = GeneDive.color.COLOR.BLUE;
      this.color.setColor(s.ids, s.color);
    });
    this.color.setColor(nhop.interactants, GeneDive.color.COLOR.ORANGE);
    this.renderDisplay();

    return _.flattenDeep([this.sets.map(s => s.ids), nhop.interactants]);
  }

  search3Hop() {
    let nhop = this.graphsearch.nHop(this.sets[0].ids[0], this.sets[1].ids[0], 3, false);

    // Re-render Search Display with Colors
    this.sets.forEach(s => {
      s.color = GeneDive.color.COLOR.BLUE;
      this.color.setColor(s.ids, s.color);
    });
    this.color.setColor(nhop.interactants, GeneDive.color.COLOR.ORANGE);
    this.renderDisplay();

    return _.flattenDeep([this.sets.map(s => s.ids), nhop.interactants]);

  }

  searchClique(minProb) {
    let clique = this.graphsearch.clique(this.sets[0].ids[0], minProb);

    // Re-render Search Display with Colors
    this.sets.forEach(s => {
      s.color = GeneDive.color.COLOR.BLUE;
      this.color.setColor(s.ids, s.color);
    });
    this.color.setColor(clique.interactants, GeneDive.color.COLOR.ORANGE);
    this.renderDisplay();

    return _.flattenDeep([this.sets.map(s => s.ids), clique.interactants, clique.non_interactants]);
  }

  renderDisplay() {
    this.display.html("");

    for (let set of this.sets) {
      let item = undefined;

      if (set.type == "gene") {
        let url = "";
        if (set.entity === "chemical")
          url =`https://www.pharmgkb.org/search?connections&query=${set.name}`;
        else
          url = `https://www.ncbi.nlm.nih.gov/gene/${set.ids[0]}`;

        item = $("<div/>")
          .addClass("search-item")
          .css("background-color", set.color)
          .append($("<span/>").addClass("name").text(set.name))
          .append(
            $("<a/>").addClass("fa fa-question ncbi-linkout")
              .data("ncbi", set.ids[0])
              .attr("data-toggle", "tooltip")
              .attr("title", "Open NCBI Datasheet In New Tab")
              .attr("href", url)
              .attr("target", "_blank")
          )
          .append(
            $("<i/>").addClass("fa fa-times text-danger remove").data("id", set.name)
              .on('click', (event) => {
                this.removeSearchSet($(event.target).data("id"))
              })
          );
      } else {
        item = $("<div/>")
          .addClass("search-item")
          .css("background-color", set.color)
          .append($("<span/>").addClass("name").text(set.name))
          .append(
            $("<i/>").addClass("fa fa-times text-danger remove").data("id", set.name)
              .on('click', (event) => {
                this.removeSearchSet($(event.target).data("id"))
              })
          );
      }

      this.display.append(item);
    }

    // Initialize tooltips
    $('[data-toggle="tooltip"]').tooltip({trigger: 'hover'});
  }

  initTypeahead() {

    var genes = new Bloodhound({
      local: AUTOCOMPLETE_SYMBOL,
      datumTokenizer: Bloodhound.tokenizers.obj.whitespace('symbol'),
      queryTokenizer: Bloodhound.tokenizers.whitespace
    });
    genes.initialize();


    var geneset = new Bloodhound({
      local: AUTOCOMPLETE_SYMBOL_SET,
      datumTokenizer: Bloodhound.tokenizers.obj.whitespace('symbol'),
      queryTokenizer: Bloodhound.tokenizers.whitespace
    });
    geneset.initialize();

    var chemical = new Bloodhound({
      local: AUTOCOMPLETE_CHEMICAL,
      datumTokenizer: Bloodhound.tokenizers.obj.whitespace('symbol'),
      queryTokenizer: Bloodhound.tokenizers.whitespace
    });
    chemical.initialize();

    var disease = new Bloodhound({
      local: AUTOCOMPLETE_DISEASE,
      datumTokenizer: Bloodhound.tokenizers.obj.whitespace('symbol'),
      queryTokenizer: Bloodhound.tokenizers.whitespace
    });
    disease.initialize();

    const TYPE_AHEAD_LIMIT = 10;
    this.input.typeahead(
      {minLength: 1, highlight: true, hint: false,},
      {
        name: 'Genes',
        source: genes,
        limit: TYPE_AHEAD_LIMIT,
        display: 'symbol',
        templates: {header: "<h4 style='color:rgb(128,128,128);'>Genes</h4>"}
      },
      {
        name: 'Chemicals',
        source: chemical,
        limit: TYPE_AHEAD_LIMIT,
        display: 'symbol',
        templates: {header: "<h4 style='color:rgb(128,128,128);'>Chemicals</h4>"}
      },
      {
        name: 'Diseases',
        source: disease,
        limit: TYPE_AHEAD_LIMIT,
        display: 'symbol',
        templates: {header: "<h4 style='color:rgb(128,128,128);'>Diseases</h4>"}
      },
      {
        name: 'Genesets',
        source: geneset,
        limit: TYPE_AHEAD_LIMIT,
        display: 'symbol',
        templates: {header: "<h4 style='color:rgb(128,128,128);'>Genesets</h4>"}
      },
    );

    $('.twitter-typeahead').css('width', '100%');

    // When suggestions box opens, put cursor on first result
    $('.twitter-typeahead input').on('typeahead:render', function () {
      $('.tt-suggestion').first().addClass('tt-cursor');
    });

    // The action we take when a typeahead element is selected
    this.input.on('typeahead:selected', (event, item) => {

      // Case: Gene w/ Disambiguation
      if (item.values.length > 1 && item.type != "set") {
        GeneDive.disambiguation.resolveIds(item.symbol, item.values);
        this.input.typeahead("val", "");
        return;
      }

      // Case: Gene w/o Disambiguation || Search Set
      this.addSearchSet(item.symbol, item.values);
      this.input.typeahead("val", "");

    });

  }

  getGraphData() {

    let graph_data = {};
    let name_lookup = [];

    for (let set of this.sets) {

      if (set.type == "gene") {
        graph_data[set.ids[0]] = {name: set.name, color: set.color};
        continue;
      }

      // Geneset: process each gene individually
      set.ids.forEach(g => {
        graph_data[g] = {name: undefined, color: set.color};
        name_lookup.push(g);
      });
    }

    return graph_data;

  }

  hasSearchSet(name) {
    return this.sets.filter(s => s.name == name).length > 0;
  }

  memberOf(id) {
    return this.sets.filter(s => s.ids.includes(String(id))).map(s => s.id);
  }

  /**
   @fn       Search.exportSearchState
   @brief    Exports the search state
   @details  Saves the data encomapsing the state of Search.
   @return   Obj of the Search obj
   @callergraph
   */
  exportSearchState() {
    return {
      "sets": this.sets,
      "topology": this.selectedTopology(),
    };
  }

  /**
   @fn       Search.importSearchState
   @brief    Sets the state of the Search
   @details  Takes the passed in object, generated by Search.exportSearchState(), and sets the state
   of the variables.
   @param    searchObj The Search state object generated by Search.exportSearchState()
   @callergraph
   */
  importSearchState(searchObj) {
    this.sets = searchObj.sets;
    this.setTopology(searchObj.topology);
    this.renderDisplay();
  }

  /**
   @fn       Search.amountOfDGDsSearched
   @brief    Lists the amount of DGDs in search
   @details
   @callergraph
   */
  amountOfDGDsSearched() {
    return this.sets.length;
  }

}

class SearchSet {
  constructor(name, ids) {
    this.id = sha256(name).slice(0, 30);
    this.name = name;
    this.type = ids.length > 1 ? "set" : "gene";
    this.ids = ids.map(i => String(i));
    this.color = "#cccccc";
    this.entity = "";

    switch (this.ids[0][0]) {
      case "C":
        this.entity = "chemical";
        break;

      case "D":
        this.entity = "disease";

      default:
        this.entity = "gene";
    }
  }

  /**
   @fn       SearchSet.getIDOfSearchSetArray
   @brief    Gets ID of SearchSet Array
   @details  Takes a SearchSet Array and generates a new ID out of all of them
   @param    sets A SearchSet Array
   @callergraph
   */
  static getIDOfSearchSetArray(sets) {
    return sha256(sets.map(set => {
      return set.id
    }).join("")).slice(0, 30);
  }

}
