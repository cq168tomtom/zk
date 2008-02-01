/* Attributes.java

{{IS_NOTE
	Purpose:
		
	Description:
		
	History:
		Mon Aug 14 21:57:02     2006, Created by tomyeh
}}IS_NOTE

Copyright (C) 2006 Potix Corporation. All Rights Reserved.

{{IS_RIGHT
}}IS_RIGHT
*/
package org.zkoss.zk.ui.impl;

/**
 * Attributes of desktops, pages and components that are used internally.
 *
 * @author tomyeh
 */
public class Attributes {
	/** A desktop attribute to indicate the completeness percentage of 
	 * the current file upload.
	 * It is an integer ranging from 0 to 99.
	 */
	public static final String UPLOAD_PERCENT = "zk_uploadPercent";
	/** A desktop attribute to indicate the number of bytes of the current
	 * file upload.
	 * It is a non-negative long.
	 */
	public static final String UPLOAD_SIZE = "zk_uploadSize";

	/** A request attribute to indicate whether "no-cache" header is
	 * generated for the current desktop.
	 * If no-cache is generated, ZK will remove a desktop as soon
	 * as possible to save the use of memory.
	 *
	 * <p>This attribute is set if ZK loader sets Cache-Control=no-cache.
	 * However, if a ZUML page is included by other servlet (such as
	 * JSP and DSP), this attribute won't be set.
	 * If you set Cache-Control manually, you might also set
	 * this attribute to save the use of memroy.
	 *
	 * <pre><code>request.setAttribute(Attributes.NO_CACHE, Boolean.TRUE);</code></pre>
	 *
	 * @since 3.0.1
	 */
	public static final String NO_CACHE = "zk_desktop_no_cache";

	/** A system property to indicate the default resend delay
	 * (an integer in milliseconds).
	 * If specified, {@link org.zkoss.zk.ui.util.Configuration#getResendDelay}
	 * will use it as the default. Otherwise, -1 is assumed.
	 * @since 3.0.3
	 */
	public static final String RESEND_DELAY = "org.zkoss.zk.au.resendDelay";
}
