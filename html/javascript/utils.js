
function isTrue(value) {
  if (typeof value == "boolean")
    return value;
  else
    return (String(value).toLowerCase() == "true");
}

_crgUtils = {
  /* Convert a string to a "safe" id.
   * This removes illegal characters from the string,
   * so it's safe to use as an element's id.
   */
  checkSbId: function(s) {
    return s.replace(/['"()]/g, "");
  },

  /* Bind and run a function.
   * This is more restrictive than the actual bind() function,
   * as only one eventType can be specified, and this does
   * not support a map as the jQuery bind() function does.
   * The eventData and initialParams parameters are optional.
   * The initialParams, if provided, is an array of the parameters
   * to supply to the initial call of the handler.
   * The handler is initially run once for each element
   * in the jQuery target object.
   * As a special case, if the eventType is "content", and
   * the initialParams are not defined, and the target
   * is a $sb() node, the target.$sbGet() value is passed as the
   * first and second initial parameters to the handler.
   */
  bindAndRun: function(target, eventType, eventData, handler, initialParams) {
    if (!$.isjQuery(target))
      target = $(target);
    target.bind(eventType, eventData, handler);
    if ($.type(eventData) == "function") {
      initialParams = handler;
      handler = eventData;
      eventData = undefined;
    }
    target.each(function() {
      var params = [ ];
      if (initialParams)
        params = initialParams;
      else if ($.trim(eventType) == "content" && $sb(this))
        params = [ $sb(this).$sbGet(), $sb(this).$sbGet() ];
//FIXME - call once for each eventType after splitting by spaces?
      var event = jQuery.Event(eventType);
      event.target = event.currentTarget = this;
      if (eventData)
        event.data = eventData;
      handler.apply(this, $.merge([ event ], params));
    });
    return target;
  },

  /* Bind functions to the addition/removal of specific children.
   * The add function is also called for each of the existing matched children.
   * This works ONLY when using a single $sb() element as the target.
   *
   * Calling api is one of:
   *   bindAddRemoveEach(target, childname, add, remove);
   *   bindAddRemoveEach(target, parameters);
   *
   * Individual parameters:
   * target: This is the $sb element, or value which can be passed to $sb(),
   *         to which the add/remove functions are bound.
   * childname: This is the name of the child elements to monitor
   *            (use null/undefined/"" to match all children)
   * add: The function to call when a child is added (use null/undefined to ignore).
   * remove: The function to call when a child is removed (use null/undefined to ignore).
   *
   * If an object is used instead, the above parameters can be included plus
   * these addition parameters:
   * subChildren: Optional boolean to indicate if events from non-immediate
   *              children should be processed; i.e. recursion.
   *              Default is false.
   * callback: A callback function that is called after this is finished
   *           (i.e. after the add function is called for all matching children)
   */
  bindAddRemoveEach: function(target, childname, add, remove) {
    target = $sb(target);
    var options = { childname: childname, add: add, remove: remove };
    if (typeof childname == "object")
      options = childname;
    childname = options.childname || "";
    add = options.add || $.noop;
    remove = options.remove || $.noop;
    var subChildren = options.subChildren || false;
    var callback = options.callback || $.noop;
    var addEventType = "add"+(childname?":"+childname:"");
    var removeEventType = "remove"+(childname?":"+childname:"");
    target.bind(addEventType, function(event,node) {
      if (subChildren || (event.target == this)) add(event,node);
    });
    target.bind(removeEventType, function(event,node) {
      if (subChildren || (event.target == this)) remove(event,node);
    });
    var currentChildren = (subChildren ? target.find(childname||"*") : target.children(childname||"*"));
    currentChildren.each(function() {
      var event = jQuery.Event(addEventType);
      event.target = $(this).parent()[0];
      event.currentTarget = target[0];
      add(event,$sb(this));
    });
    callback();
    return target;
  },

  showLoginDialog: function(titleText, nameText, buttonText, callback) {
    var dialog = $("<div>").append($("<a>").html(nameText)).append("<input type='text'/>");
    var login = function() {
      if (callback(dialog.find("input:text").val()))
        dialog.dialog("destroy");
    };
    dialog.find("input:text").keydown(function(event) { if (event.which == 13) login(); });
    dialog.dialog({
      modal: true,
      closeOnEscape: false,
      title: titleText,
      buttons: [ { text: buttonText, click: login } ]
    });
  },

  /* This sets up the select option list with values from all children
   * of a specific parent in the $sb() tree.  Parameters can be passed
   * in an object either as the "params" parameter or as part of the
   * element's data() using the key "sbelement".  The "params" parameter
   * takes precedence if both are specified.  If no parameters at all
   * are provided, no changes are made.
   *
   * The select element parameter can be a jQuery object containing
   * a select element, a actual select element reference, or a string
   * that can be passed to $() to create a new select element.
   * This returns the select element.
   *
   * Parameters are:
   *
   *   compareOptions: function(a, b)
   *     Optional function used in sorting the options.
   *     This should return true if a is "greater than" b
   *     (indicating a is sorted after b in the default sort function).
   *     If not specified, the options will be sorted
   *     alphabetically using their "text" value.
   *   createOption: function(node)
   *     Optional function used to create the new option element
   *     for a given scoreboard node.  This must return the created
   *     option.  The default function calls the tagOption function,
   *     so if you override this you must either call the tagOption
   *     function or also override the removeOption function.  Also,
   *     the default function operates using all the option* parameters
   *     as described below, so if you override this function none of
   *     those will have any effect.  By default, this function sets
   *     the new option text and value fields to the node's $sbId.
   *   tagOption: function(option, node)
   *     Optional function that tags the option element.  This
   *     is used by the default removeOption function, so if you
   *     override this you must also override the removeOption function.
   *   addOption: function(option)
   *     Optional function used to add each new option to the
   *     select element.  If not set, the new option will be
   *     added in sorted order using the compareOptions function.
   *   removeOption: function(node)
   *     Optional function used to remove an option.  If
   *     not set, the option with the tag set in the
   *     default tagOption function will be removed.
   *
   *   firstOption: $(<option>) || name || { text:, value: }
   *     Optional parameter to set the first option element.
   *     If a jQuery object containing only an option element
   *     is passed, it is directly used.  If a string is passed,
   *     it is used for both the name and value of a newly created
   *     option element.  If an object is passed, its "text" and
   *     "value" fields are used for a newly created option element's
   *     "text" and "value" fields, respectively.
   *   prependOptions: array (can contain any of type defined in firstOption)
   *     This is the same as the firstOption parameter, but can be used
   *     for multiple initial options.
   *
   *   optionParent: $sb || string
   *     This is the main node in the scoreboard.  If a string is passed,
   *     it is converted using the standard $sb(string) function.
   *   optionChildName: string
   *     This is the name of which children to use.
   *   optionChildFilter: function(node)
   *     Optional function to filter out children.
   *     Its parameter is the child $sb() element, and it returns
   *     a boolean indicating if it should be included in the list or not.
   *     By default all children are included.
   *   optionNameElement: string
   *     Optional name of each child subelement value to use
   *     for the option text.
   *     If not set, the child node's $sbId will be used.
   *   optionValueElement: string
   *     Optional name of each child subelement value to use
   *     for the option value.
   *     If not set, the child node's $sbId will be used.
   */
  setupSelect: function(s, params) {
    s = $(s);
    var params = params || s.data("sbelement") || {};

    var initialOptions = 0;
    var addInitialOption = function(i, opt) {
      if (!opt)
        opt = i;
      var newOpt;
      if ($.isjQuery(opt)) {
        var o = opt.filter("option");
        if (o.length == 1)
          newOpt = o;
      } else if (typeof opt == "string")
        newOpt = $("<option>").text(opt).val(opt);
      else if (typeof opt == "object")
        newOpt = $("<option>").text(opt.text).val(opt.value);
      if (newOpt) {
        initialOptions++;
        s.prepend(newOpt);
      }
    };

    if ($.isArray(params.prependOptions))
      $.each($.merge([], params.prependOptions).reverse(), addInitialOption);
    addInitialOption(params.firstOption);

    var optionParent = params.optionParent;
    if (typeof optionParent == "string")
      optionParent = $sb(optionParent);
    var optionChildName = params.optionChildName;
    var optionChildFilter = (params.optionChildFilter || function() { return true; });
    var optionNameElement = params.optionNameElement;
    var optionValueElement = params.optionValueElement;

//FIXME - need to add code to unbind if/when the option/select is removed from the DOM!
    var setOptionName = function(option, node) {
      if (optionNameElement) {
        node.$sb(optionNameElement).$sbBindAndRun("content", function(event, value) {
          option.html(value);
          addOption(option); // Reorder, if needed
        });
      } else
        option.html(node.$sbId);
    };
    var setOptionValue = function(option, node) {
      if (optionValueElement) {
        node.$sb(optionValueElement).$sbBindAndRun("content", function(event, value) {
          option.val(value);
          if (option.attr("selected"))
            s.change(); // Update select with new value
        });
      } else
        option.val(node.$sbId);
    };

    var tagOption = params.tagOption || function(o, node) {
      o.attr("data-optionid", node.$sbPath);
    };
    var createOption = params.createOption || function(node) {
      var option = $("<option>");
      setOptionName(option, node);
      setOptionValue(option, node);
      tagOption(option, node);
      return option;
    };
    var compareOptions = params.compareOptions || function(a, b) {
      return _windowFunctions.alphaSortByAttr(a, b, "text");
    };
    var addOption = params.addOption || function(o) {
      var doChange = !s.find("option").length;
      _windowFunctions.appendSorted(s, o, compareOptions, initialOptions);
      if (doChange)
        s.change();
    };
    var removeOption = params.removeOption || function(node) {
      var option = s.find("option[data-optionid='"+node.$sbPath+"']");
      var selected = option.attr("selected");
      option.remove();
      if (selected)
        s.change();
    };

    if (optionParent && optionChildName) {
      _crgUtils.bindAddRemoveEach(optionParent, optionChildName, function(event, node) {
        if (optionChildFilter(node))
          addOption(createOption(node));
      }, function(event, node) {
        removeOption(node);
      });
    }

    return s;
  },

  showBrowserWarning: function(next, options) {
    var callNext = true;
    $.each(options, function(key,value) {
      if ($.browser[key]) {
        alert(value);
        return (callNext = false);
      }
    });
    if (callNext)
      next();
  }
};
