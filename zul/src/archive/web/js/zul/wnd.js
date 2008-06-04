/* wnd.js

{{IS_NOTE
	Purpose:
		
	Description:
		Window
	History:
		Thu Mar 15 16:00:23     2007, Created by tomyeh
}}IS_NOTE

Copyright (C) 2007 Potix Corporation. All Rights Reserved.

{{IS_RIGHT
}}IS_RIGHT
*/
zk.load("zul.zul"); //zul and msgzul

////
// window //
zkWnd = {
	ztype: "Wnd" // since we have a 'Wnd2' js.
};
zkWnd._szs = {} //Map(id, Draggable)
zkWnd._clean2 = {}; //Map(id, mode): to be cleanup the modal effect
zkWnd._modal2 = {}; //Map(id, todo): to do 2nd phase modaling (disable)

zkWnd.init = function (cmp) {
	var btn = $e(cmp.id + "!close");
	if (btn) {
		zk.listen(btn, "click", function (evt) {zkau.sendOnClose(cmp, true); Event.stop(evt);});
		zk.listen(btn, "mouseover", function () {if (window.zkau) zkau.onimgover(btn);});
			//FF: at the moment of browsing to other URL, listen is still attached but
			//our js are unloaded. It causes JavaScript error though harmlessly
			//This is a dirty fix (since onclick and others still fail but hardly happen)
		zk.listen(btn, "mouseout", function () {zkau.onimgout(btn);});
		if (!btn.style.cursor) btn.style.cursor = "default";
	}

	zk.listen(cmp, "mousemove", function (evt) {if(window.zkWnd) zkWnd.onmouseove(evt, cmp);});
		//FF: at the moment of browsing to other URL, listen is still attached but
		//our js are unloaded. It causes JavaScript error though harmlessly
		//This is a dirty fix (since onclick and others still fail but hardly happen)
	zkWnd.setSizable(cmp, zkWnd.sizable(cmp));	
	
	//Bug #1840866
	zkWnd._initMode(cmp);
		// But, for a Sun's bug, we need to invoke initMode directly to prevent 
		// that the outline of page is gone.
		// Note: we fixed bug #1830668 bug by using addInitLater to invoke
		// _initMode later, but, with ZK 3.0.4, the problem is already resolved
		// without using addInitLater
};
zkWnd.cleanup = function (cmp) {
	zkWnd.setSizable(cmp, false);
	zkWnd._cleanMode(cmp);
};
/** Fixed the content div's height. */
zkWnd.onVisi = zkWnd.onSize = zkWnd._fixHgh = function (cmp) {
	if (!zk.isRealVisible(cmp)) return; //Bug #1944729
	var hgh = cmp.style.height;
	if (hgh && hgh != "auto") {
		var n = $e(cmp.id + "!cave");
		if (n) {
			if (zk.ie6Only) n.style.height = ""; //Bug 1914104
			zk.setOffsetHeight(n, zk.getVflexHeight(n));
			 //Bug 1914104: we have to clean up for particular case with IE6
			 //but we cannot use % everywhere. Otherwise, it introduced
			 //unnecessary vertical bar
		}
	}
};
zkWnd._embedded = function (cmp) {
	var v = getZKAttr(cmp, "mode");
	return !v || v == "embedded";
};
zkWnd.setAttr = function (cmp, nm, val) {
	switch (nm) {
	case "visibility":
		var visible = val == "true",
			embedded = zkWnd._embedded(cmp),
			order = embedded ? 0: 1;

		//three cases:
		//order=0: cmp and all its ancestor are embedded
		//1: cmp is the first non-embedded, i.e., all its ancestors are embeded
		//2: cmp has an ancesor is non-embedded
		//
		//Since vparent is used if order=1, we have to handle visibility diff
		for (var n = cmp; n = $parent(n);) {
			if ($type(n) == zkWnd.ztype && !zkWnd._embedded(n)) {
				order = 2;
				break;
			}
		}

		if (order == 1) { //with vparent
			setZKAttr(cmp, "vvisi", visible ? 't': 'f');
			visible = visible && zk.isRealVisible($parent($childExterior(cmp))); //Bug #1831534
			zk.setVisible(cmp, visible, true);
			if (visible) zk.setVParent(cmp); //Bug 1816451
		} else {
			//order=0: might have a child with vparent, and realVisi changed
			if (order == 0 && (visible != zk.isRealVisible(cmp))) {
				for (var id in zk._vpts)
					if (zk.isAncestor(cmp, id)) {
						var n = $e(id);
						if (n) {
							var vvisi = getZKAttr(n, "vvisi");
							if (vvisi != 'f') {
								var nvisi = $visible(n);
								if (nvisi != visible) {
									if (!vvisi)
										setZKAttr(n, "vvisi", nvisi ? 't': 'f');
									zk.setVisible(n, visible, true);
								}
							}
						}
					}
			}

			rmZKAttr(cmp, "vvisi"); //just in case
			zk.setVisible(cmp, visible, true);
		}
		if (!embedded) zkau.hideCovered(); //Bug 1719826
		return true;

	case "z.sizable":
		zkau.setAttr(cmp, nm, val);
		zkWnd.setSizable(cmp, val == "true");
		return true;

	case "z.cntStyle":
		var n = $e(cmp.id + "!cave");
		if (n) {
			zk.setStyle(n, val != null ? val: "");
			zkWnd._fixHgh(cmp); //border's dimension might be changed
		}
		return true;  //no need to store z.cntType
	case "z.cntScls":
		var n = $e(cmp.id + "!cave");
		if (n) {
			n.className = val != null ? val: "";
			zkWnd._fixHgh(cmp); //border's dimension might be changed
		}
		return true; //no need to store it

	case "z.pos":
		var pos = getZKAttr(cmp, "pos");
		zkau.setAttr(cmp, nm, val);
		if (val && !zkWnd._embedded(cmp)) {
			if (pos == "parent" && val != pos) {
				var left = cmp.style.left, top = cmp.style.top;
				var xy = getZKAttr(cmp, "offset").split(",");
				left = $int(left) - $int(xy[0]) + "px";
				top = $int(top) - $int(xy[1]) + "px";
				cmp.style.left = left;
				cmp.style.top = top;
				rmZKAttr(cmp, "offset");
			} else if (val == "parent") {
				var parent = zk.isVParent(cmp);
				if (parent) {
					var xy = zk.revisedOffset(parent),
						left = $int(cmp.style.left), top = $int(cmp.style.top);
					setZKAttr(cmp, "offset", xy[0]+ "," + xy[1]);
					cmp.style.left = xy[0] + $int(cmp.style.left) + "px";
					cmp.style.top = xy[1] + $int(cmp.style.top) + "px";
				}
			}
			zkWnd._center(cmp, null, val);
			//if val is null, it means no change at all
			zkau.hideCovered(); //Bug 1719826 
		}
		return true;

	case "style":
	case "style.height":
		zkau.setAttr(cmp, nm, val);
		if (nm == "style.height") {
			zk.beforeSizeAt(cmp);
			zk.onSizeAt(cmp); // Note: IE6 is broken, because its offsetHeight doesn't update.
		} else {
			zkWnd._fixHgh(cmp);
		}
		return true;
	case "style.width":
		zkau.setAttr(cmp, nm, val);
		zk.beforeSizeAt(cmp);
		zk.onSizeAt(cmp);
		return true;
	case "style.top":
	case "style.left":
		if (!zkWnd._embedded(cmp) && getZKAttr(cmp, "pos") == "parent") {
			var offset = getZKAttr(cmp, "offset");
			if (offset) {
				var xy = offset.split(",");
				if (nm == "style.top") {
					cmp.style.top = $int(xy[1]) + $int(val) + "px";
				} else {
					cmp.style.left = $int(xy[0]) + $int(val) + "px";
				}
				return true;
			}
		}
	}
	return false;
};

////////
// Handle sizable window //
zkWnd.sizable = function (cmp) {
	return getZKAttr(cmp, "sizable") == "true";
};
zkWnd.setSizable = function (cmp, sizable) {
	var id = cmp.id;
	if (sizable) {
		if (!zkWnd._szs[id]) {
			var orgpos = cmp.style.position; //Bug 1679593
			zkWnd._szs[id] = new Draggable(cmp, {
				starteffect: zkau.closeFloats, overlay: true,
				endeffect: zkWnd._endsizing, ghosting: zkWnd._ghostsizing,
				revert: true, reverteffect: zk.voidf,
				ignoredrag: zkWnd._ignoresizing, draw: zkWnd._draw
			});
			cmp.style.position = orgpos;
		}
	} else {
		if (zkWnd._szs[id]) {
			zkWnd._szs[id].destroy();
			delete zkWnd._szs[id];
		}
	}
};
/** 0: none, 1: top, 2: right-top, 3: right, 4: right-bottom, 5: bottom,
 * 6: left-bottom, 7: left, 8: left-top
 */
zkWnd._insizer = function (cmp, x, y) {
	var ofs = zk.revisedOffset(cmp);
	var r = ofs[0] + cmp.offsetWidth, b = ofs[1] + cmp.offsetHeight;
	if (x - ofs[0] <= 5) {
		if (y - ofs[1] <= 5) return 8;
		else if (b - y <= 5) return 6;
		else return 7;
	} else if (r - x <= 5) {
		if (y - ofs[1] <= 5) return 2;
		else if (b - y <= 5) return 4;
		else return 3;
	} else {
		if (y - ofs[1] <= 5) return 1;
		else if (b - y <= 5) return 5;
	}
};
zkWnd.onmouseove = function (evt, cmp) {
	var target = Event.element(evt);
	if (zkWnd.sizable(cmp)) {
		var c = zkWnd._insizer(cmp, Event.pointerX(evt), Event.pointerY(evt));
		var handle = zkWnd._embedded(cmp) ? false : $e(cmp.id + "!caption");
		if (c) {
			zk.backupStyle(cmp, "cursor");
			cmp.style.cursor = c == 1 ? 'n-resize': c == 2 ? 'ne-resize':
				c == 3 ? 'e-resize': c == 4 ? 'se-resize':
				c == 5 ? 's-resize': c == 6 ? 'sw-resize':
				c == 7 ? 'w-resize': 'nw-resize';
			if (handle) handle.style.cursor = "";
		} else {
			zk.restoreStyle(cmp, "cursor");
			if (handle) handle.style.cursor = "move";
		}
	}
};
/** Called by zkWnd._szs[]'s ignoredrag for resizing window. */
zkWnd._ignoresizing = function (cmp, pointer) {
	var dg = zkWnd._szs[cmp.id];
	if (dg) {
		var v = zkWnd._insizer(cmp, pointer[0], pointer[1]);
		if (v) {
			dg.z_dir = v;
			var offs = zk.revisedOffset(cmp);
			dg.z_box = {
				top: offs[1], left: offs[0] ,height: cmp.offsetHeight,
				width: cmp.offsetWidth, minHeight: $int(getZKAttr(cmp, "minheight")),
				minWidth: $int(getZKAttr(cmp, "minwidth"))
			};
			dg.z_orgzi = cmp.style.zIndex;
			return false;
		}
	}
	return true;
};
zkWnd._endsizing = function (cmp, evt) {
	var dg = zkWnd._szs[cmp.id];
	if (!dg) return;

	if (dg.z_orgzi != null) {
		cmp.style.zIndex = dg.z_orgzi; //restore it (Bug 1619349)
		dg.z_orgzi = null
	}

	if (dg.z_szofs) {
		var keys = "";
		if (evt) {
			if (evt.altKey) keys += 'a';
			if (evt.ctrlKey) keys += 'c';
			if (evt.shiftKey) keys += 's';
		}

		//adjust size
		setTimeout("zkWnd._resize($e('"+cmp.id+"'),"+dg.z_szofs.top+","
			+dg.z_szofs.left+","+dg.z_szofs.height+","+dg.z_szofs.width+",'"+keys+"')", 50);
		dg.z_box = dg.z_dir = dg.z_szofs = null;
	}
};
zkWnd._resize = function (cmp, t, l, h, w, keys) {
	cmp.style.visibility = "hidden";
	if (w != cmp.offsetWidth || h != cmp.offsetHeight) {
		if (w != cmp.offsetWidth) cmp.style.width = w + "px";
		if (h != cmp.offsetHeight) {
			cmp.style.height = h + "px";
			zkWnd._fixHgh(cmp);
		}
		zkau.sendOnSize(cmp, keys);
	}
	if (l != cmp.offsetLeft || t != cmp.offsetTop) {
		if (l != null) cmp.style.left = l + "px";
		if (t != null) cmp.style.top = t + "px";
		zkau.sendOnMove(cmp, keys);
	}
	cmp.style.visibility = "";
	if (!zkWnd._embedded(cmp))
		zkau.hideCovered();
};

/* @param ghosting whether to create or remove the ghosting
 */
zkWnd._ghostsizing = function (dg, ghosting, pointer) {
	if (ghosting) {
		var ofs = zkau.beginGhostToDIV(dg);
		var html = '<div id="zk_ddghost" class="rz-win-proxy" style="position:absolute;top:'
			+ofs[1]+'px;left:'+ofs[0]+'px;width:'
			+zk.offsetWidth(dg.element)+'px;height:'+zk.offsetHeight(dg.element)
			+'px;"></div>';
			document.body.insertAdjacentHTML("afterbegin", html);
		dg.element = $e("zk_ddghost");
	} else {
		var org = zkau.getGhostOrgin(dg);
		if (org) {
			dg.z_szofs = {
				top: dg.element.offsetTop, left: dg.element.offsetLeft, 
				height: zk.revisedSize(dg.element, dg.element.offsetHeight, true), 
				width: zk.revisedSize(dg.element, dg.element.offsetWidth)
				};
		} else {
			dg.z_szofs = null;
		}
		zkau.endGhostToDIV(dg);
	}
};
zkWnd._draw = function (dg, pointer) {
	if (dg.z_dir == 8 || dg.z_dir <= 2) {
		var h = dg.z_box.height + dg.z_box.top - pointer[1];
		if (h < dg.z_box.minHeight) {
			pointer[1] = dg.z_box.height + dg.z_box.top - dg.z_box.minHeight;
			h = dg.z_box.minHeight;
		}
		dg.element.style.height = h + "px";
		dg.element.style.top = pointer[1] + "px";
	}
	if (dg.z_dir >= 4 && dg.z_dir <= 6) {
		var h = dg.z_box.height + pointer[1] - dg.z_box.top;
		if (h < dg.z_box.minHeight) h = dg.z_box.minHeight;
		dg.element.style.height = h + "px";
	}
	if (dg.z_dir >= 6 && dg.z_dir <= 8) {
		var w = dg.z_box.width + dg.z_box.left - pointer[0];
		if (w < dg.z_box.minWidth) {
			pointer[0] = dg.z_box.width + dg.z_box.left - dg.z_box.minWidth;
			w = dg.z_box.minWidth;
		}
		dg.element.style.width = w + "px";
		dg.element.style.left = pointer[0] + "px";
	}
	if (dg.z_dir >= 2 && dg.z_dir <= 4) {
		var w =  dg.z_box.width + pointer[0] - dg.z_box.left;
		if (w < dg.z_box.minWidth) w = dg.z_box.minWidth;
		dg.element.style.width = w + "px";
	}
};
////////
// Handling Overlapped, Modal, Popup and Embedded //
zkWnd._initMode = function (cmp) {
	var mode = getZKAttr(cmp, "mode");
	var replace = zkWnd._clean2[cmp.id] == mode;
	if (replace) {//replace with the same mode
		delete zkWnd._clean2[cmp.id]; //and _doXxx will handle it
		if (getZKAttr(cmp, "visible") == "true")
			cmp.style.visibility = "visible";
	}
	else if (zkWnd._clean2[cmp.id])
		zkWnd._cleanMode2(cmp.id, true); //replace with a new mode
	switch (mode) {
	case "modal":
	case "highlighted":
		zkWnd._doModal(cmp, replace);
		break;
	case "overlapped":
		zkWnd._doOverlapped(cmp, replace);
		break;
	case "popup":
		zkWnd._doPopup(cmp, replace);
	//default: embedded
	}
};
zkWnd._cleanMode = function (cmp) {
	var mode = getZKAttr(cmp, "mode");
	if (mode) {
		zkWnd._stick(cmp); //cleanup draggable or so
		zkWnd._clean2[cmp.id] = mode;
		setTimeout("zkWnd._cleanMode2('"+cmp.id+"')", 5);
			//don't clean immediately since it might be replaced
			//(due to invalidate)
	}
};
/** 2nd phase of cleaning mode. */
zkWnd._cleanMode2 = function (uuid, replace) {
	var mode = zkWnd._clean2[uuid];
	if (mode) {
		delete zkWnd._clean2[uuid];

		switch (mode) {
		case "modal":
		case "highlighted":
			zkWnd._endModal(uuid, replace);
			break;
		case "overlapped":
			zkWnd._endOverlapped(uuid, replace);
			break;
		case "popup":
			zkWnd._endPopup(uuid, replace);
	//default: embedded
		}
	}
};
/** Shows the window with the anima effect, if any. */
zkWnd._show = function (cmp) {
	if (getZKAttr(cmp, "conshow")) //enforce the anima effect, if any
		cmp.style.display = "none";
		
	if (getZKAttr(cmp, "visible") == "true")
		cmp.style.visibility = "visible";
			//turn it on since Window.getRealStyle turn it off to
			//have the better effect if the window contains a lot of items
	zk.show(cmp);
};

//Overlap/Popup//
/** Makes the component as popup. */
zkWnd._doPopup = function (cmp, replace) {
	zkWnd._doOverpop(cmp, zkau._popups, replace);
};
/** Makes the popup component as normal. */
zkWnd._endPopup = function (uuid, replace) {
	zkWnd._endOverpop(uuid, zkau._popups, replace);
};

/** Makes the component as overlapped. */
zkWnd._doOverlapped = function (cmp, replace) {
	zkWnd._doOverpop(cmp, zkau._overlaps, replace);
};
/** Makes the popup component as normal. */
zkWnd._endOverlapped = function (uuid, replace) {
	zkWnd._endOverpop(uuid, zkau._overlaps, replace);
};

zkWnd._doOverpop = function (cmp, storage, replace) {
	var pos = getZKAttr(cmp, "pos");
	var isV = zkWnd.shallVParent(cmp);
	if (!pos && isV && !cmp.style.top && !cmp.style.left) {		
		var xy = zk.revisedOffset(cmp);
		cmp.style.left = xy[0] + "px";
		cmp.style.top = xy[1] + "px";
	} else if (pos == "parent" && isV) {
		var xy = zk.revisedOffset(cmp.parentNode),
			left = $int(cmp.style.left), top = $int(cmp.style.top);
		setZKAttr(cmp, "offset", xy[0]+ "," + xy[1]);
		cmp.style.left = xy[0] + $int(cmp.style.left) + "px";
		cmp.style.top = xy[1] + $int(cmp.style.top) + "px";
	}
	if (isV) zk.setVParent(cmp);
	
	if (replace) {
		zkau.fixZIndex(cmp);
		zkWnd._float(cmp);
		return;
	}
	
	if (pos) zkWnd._center(cmp, null, pos); //unlike modal, change only if pos

	zkau.closeFloats(cmp);

	zkau.fixZIndex(cmp);
	zkWnd._float(cmp);
	storage.push(cmp.id); //store ID because it might cease before endPopup
	zkau.hideCovered();

	if (zk.isVisible(cmp)) //it happens when closing a modal (becomes overlap)
		zkWnd._show(cmp);

	//zk.asyncFocusDown(cmp.id, 45); //don't exceed 50 (see au's focus command)
	//20080215 Tom: don't change focus if overlapped (more reasonable spec)
};
zkWnd._endOverpop = function (uuid, storage, replace) {
	storage.remove(uuid);		
	var cmp = $e(uuid);
	if (cmp) {
		zk.unsetVParent(cmp);
		zkau.hideCovered();
		if (!replace) zkWnd._stick(cmp);
	}
};
/** Test whether el shall become a virtual parent (when overlap/...).
 * Note: only the first overlap/... need to setVParent
 */
zkWnd.shallVParent = function (el) {
	while (el = $parent(el))
		if ($type(el) == zkWnd.ztype && !zkWnd._embedded(el))
			return false; //only one of them shall become a virtual parent
	return true;
};
//Modal//
/** Makes the window as modal. */
zkWnd._doModal = function (cmp, replace) {
	if (replace) {
		zkWnd._float(cmp);
		return;
	}
	if (!getZKAttr(cmp, "conshow")) {
		var onshow = getZKAttr(cmp, "aos") || "appear";
		if (onshow != "z_none")
			setZKAttr(cmp, "conshow", "anima." + onshow + "($e('"+cmp.id+"'));");
	}
	//center component
	var nModals = zkau._modals.length;
	zkau.fixZIndex(cmp, true); //let fixZIndex reset topZIndex if possible
	var zi = ++zkau.topZIndex; //mask also need another index

	var pos = getZKAttr(cmp, "pos");
	if (zkWnd.shallVParent(cmp)) {
		if (pos == "parent") {
			var xy = zk.revisedOffset(cmp.parentNode),
				left = $int(cmp.style.left), top = $int(cmp.style.top);
			setZKAttr(cmp, "offset", xy[0]+ "," + xy[1]);
			cmp.style.left = xy[0] + $int(cmp.style.left) + "px";
			cmp.style.top = xy[1] + $int(cmp.style.top) + "px";
		}
		zk.setVParent(cmp);
	}
	zkWnd._center(cmp, zi, pos); //called even if pos not defined
		//show dialog first to have better response.
	
	if (!pos) {
		var top = $int(cmp.style.top), y = zk.innerY();
		if (y) {
			var y1 = top - y;
			if (y1 > 100) {
				cmp.style.top = top - (y1 - 100) + "px";
			}
		} else if (top > 100){
			cmp.style.top = "100px";
		}
	}
	zkWnd._show(cmp); //unlike other mode, it must be visible

	zkau.closeFloats(cmp);

	var maskId = cmp.id + ".mask";
	var mask = $e(maskId);
	if (!mask) {
		//Note: a modal window might be a child of another
		var bMask = true;
		for (var j = 0; j < nModals; ++j) {
			var n = $e(zkau._modals[j]);
			if (n && zk.isAncestor(n, cmp)) {
				bMask = false;
				break;
			}
		}
		if (bMask) {
			//bug 1510218: we have to make it as a sibling to cmp
			cmp.insertAdjacentHTML(
				"beforebegin", '<div id="'+maskId+'" class="modal_mask"></div>');
			mask =  $e(maskId);
		}
	}

	//position mask to be full window
	if (mask) {
		zkWnd._posMask(mask);
		mask.style.display = "block";
		mask.style.zIndex = zi - 1;
		if (zkau.currentFocus) //store it
			mask.setAttribute("zk_prevfocus", zkau.currentFocus.id);
	}

	zkau._modals.push(cmp.id);
	if (nModals == 0) {
		zk.listen(window, "resize", zkWnd._onMoveMask);
		zk.listen(window, "scroll", zkWnd._onMoveMask);
	}

	zkWnd._float(cmp);
	zk.asyncFocusDown(cmp.id, 45); //don't exceed 50 (see au's focus command)

	zkWnd._modal2[cmp.id] = true;
	setTimeout("zkWnd._doModal2('"+cmp.id+"')", 5); //process it later for better responsive
};
/** Does the 2nd phase processing of modal. */
zkWnd._doModal2 = function (uuid) {
	if (zkWnd._modal2[uuid]) {
		delete zkWnd._modal2[uuid];

		var cmp = $e(uuid);
		if (cmp) {
			zk.restoreDisabled(cmp); //there might be two or more modal dlgs
			zk.disableAll(cmp);
		}
	}
};
/** Clean up the modal component. */
zkWnd._endModal = function (uuid, replace) {
	var maskId = uuid + ".mask";
	var mask = $e(maskId);
	var prevfocusId;
	if (mask) {
		prevfocusId = mask.getAttribute("zk_prevfocus");
		zk.remove(mask);
	}

	zkau._modals.remove(uuid);
	delete zkWnd._modal2[uuid];
	
	var cmp = $e(uuid);
	if (cmp) zk.unsetVParent(cmp);
	if (zkau._modals.length == 0) {
		zk.unlisten(window, "resize", zkWnd._onMoveMask);
		zk.unlisten(window, "scroll", zkWnd._onMoveMask);
		window.onscroll = null;
		zk.restoreDisabled();
	} else {
		var lastid = zkau._modals[zkau._modals.length - 1];
		var last = $e(lastid);
		if (last) {
			zk.restoreDisabled(last);
			if (!prevfocusId && !zk.inAsyncFocus) zk.asyncFocusDown(lastid, 20);
		}
	}

	if (!replace && cmp) zkWnd._stick(cmp);

	if (prevfocusId && !zk.inAsyncFocus) zk.asyncFocus(prevfocusId, 20);
};

/** Handles onsize to re-position mask. */
zkWnd._onMoveMask = function (evt) {
	for (var j = zkau._modals.length; --j >= 0;) {
		var mask = $e(zkau._modals[j] + ".mask");
		if (mask) {
			zkWnd._posMask(mask);
			return;
		}
	}
};
/** Position the mask window. */
zkWnd._posMask = function (mask) {
	var ofs = zk.toStyleOffset(mask, zk.innerX(), zk.innerY());
	mask.style.left = ofs[0] + "px";
	mask.style.top = ofs[1] + "px";
	mask.style.width = zk.innerWidth() + "px";
	mask.style.height = zk.innerHeight() + "px";
};
/** Makes a window in the center. */
zkWnd._center = function (cmp, zi, pos) {
	if (pos == "parent") return;
	cmp.style.position = "absolute"; //just in case
	zk.center(cmp, pos);
	zkau.sendOnMove(cmp);

	if (zi || zi == 0) {
		cmp.style.zIndex = zi;
		zkau.sendOnZIndex(cmp);
		//let the server know the position. otherwise, invalidate will
		//cause it to be moved to center again
	}
}

//Utilities//
/** Makes a window movable. */
zkWnd._float = function (cmp) {
	if (cmp) {
		var handle = $e(cmp.id + "!caption");
		if (handle) {
			handle.style.cursor = "move";
			cmp.style.position = "absolute"; //just in case
			zul.initMovable(cmp, {
				handle: handle, starteffect: zkWnd._startMove, overlay: true,
				change: zkau.hideCovered, ghosting: zkWnd._ghostmove, 
				ignoredrag: zkWnd._ignoremove,
				endeffect: zkWnd._onWndMove});
			//we don't use options.change because it is called too frequently
		}
	}
};
/* @param ghosting whether to create or remove the ghosting
 */
zkWnd._ghostmove = function (dg, ghosting, pointer) {
	if (ghosting) {
		var ofs = zkau.beginGhostToDIV(dg), title = zk.firstChild(dg.element, "TABLE"),
			fakeT = title.cloneNode(true);
		var html = '<div id="zk_ddghost" class="move-win-ghost" style="position:absolute;top:'
			+ofs[1]+'px;left:'+ofs[0]+'px;width:'
			+zk.offsetWidth(dg.element)+'px;height:'+zk.offsetHeight(dg.element)
			+'px;z-index:'+dg.element.style.zIndex+'"><ul></ul></div></div>';
		document.body.insertAdjacentHTML("afterbegin", html);
		dg._zoffs = ofs;
		dg.element.style.visibility = "hidden";
		var h = dg.element.offsetHeight - title.offsetHeight;
		dg.element = $e("zk_ddghost");
		dg.element.firstChild.style.height = zk.revisedSize(dg.element.firstChild, h, true) + "px";
		dg.element.insertBefore(fakeT, dg.element.firstChild);
	} else {
		var org = zkau.getGhostOrgin(dg);
		if (org) {
			org.style.top = org.offsetTop + dg.element.offsetTop - dg._zoffs[1] + "px";
			org.style.left = org.offsetLeft + dg.element.offsetLeft - dg._zoffs[0] + "px";
		}
		zkau.endGhostToDIV(dg);
		document.body.style.cursor = "";
	}
};
zkWnd._ignoremove = function (cmp, pointer, event) {
	if (!zkWnd.sizable(cmp) || (cmp.offsetTop + 4 < pointer[1] && cmp.offsetLeft + 4 < pointer[0] 
		&& cmp.offsetLeft + cmp.offsetWidth - 4 > pointer[0])) return false;
	return true;
};
/**
 * For bug #1568393: we have to change the percetage to the pixel.
 */
zkWnd._startMove = function (cmp, handle) {
	if(cmp.style.top && cmp.style.top.indexOf("%") >= 0)
		 cmp.style.top = cmp.offsetTop + "px";
	if(cmp.style.left && cmp.style.left.indexOf("%") >= 0)
		 cmp.style.left = cmp.offsetLeft + "px";
	zkau.closeFloats(cmp, handle);
};
/** Makes a window un-movable. */
zkWnd._stick = function (cmp) {
	if (cmp) {
		zul.cleanMovable(cmp.id);
		cmp.style.position = ""; //aculous changes it to relative
	}
};

/** Called back when overlapped and popup is moved. */
zkWnd._onWndMove = function (cmp, evt) {
	cmp.style.visibility = "";
	var keys = "";
	if (evt) {
		if (evt.altKey) keys += 'a';
		if (evt.ctrlKey) keys += 'c';
		if (evt.shiftKey) keys += 's';
	}
	zkau.sendOnMove(cmp, keys);
};
