# Tawsel Delivery Route Workspace — Stitch export

Project ID: `16661174340563199513`

Original Stitch screen screenshots and HTML exports, organized by the screen numbers in their titles. The exported HTML is preserved as downloaded.

| Screen | Title | Screenshot | HTML |
| --- | --- | --- | --- |
| 1 | توصيل - رحلة السائق النشطة (Screen 1) | [JPEG](screens/01-active-driver-trip/screen.jpg) | [HTML](screens/01-active-driver-trip/code.html) |
| 2 | توصيل - تفاصيل الوقفة والتنفيذ (Screen 2) | [JPEG](screens/02-stop-details/screen.jpg) | [HTML](screens/02-stop-details/code.html) |
| 3 | توصيل - مساحة عمل الموزع المكتبي (Screen 3) | [JPEG](screens/03-dispatcher-workspace/screen.jpg) | [HTML](screens/03-dispatcher-workspace/code.html) |
| 4 | توصيل - تسجيل الدخول ومساحة العمل (Screen 4) | [PNG](screens/04-login-workspace/screen.png) | [HTML](screens/04-login-workspace/code.html) |
| 5 | توصيل - رحلات اليوم للمندوب (Screen 5) | [PNG](screens/05-driver-daily-trips/screen.png) | [HTML](screens/05-driver-daily-trips/code.html) |
| 6 | توصيل - تجهيز وتعديل خط السير (Screen 6) | [PNG](screens/06-route-preparation/screen.png) | [HTML](screens/06-route-preparation/code.html) |
| 7 | توصيل - مراجعة وتأكيد اللوكيشن (Screen 7) | [PNG](screens/07-location-review/screen.png) | [HTML](screens/07-location-review/code.html) |
| 8 | توصيل - ملخص إتمام الرحلة (Screen 8) | [PNG](screens/08-trip-completion/screen.png) | [HTML](screens/08-trip-completion/code.html) |
| 9 | توصيل - سجل المزامنة وحل التعارضات (Screen 9) | [PNG](screens/09-sync-conflicts/screen.png) | [HTML](screens/09-sync-conflicts/code.html) |

See [manifest.json](manifest.json) for screen IDs, source URLs, device types, reported and downloaded dimensions, and SHA-256 checksums. Each screen also has its own metadata.json.

Files were retrieved with curl using redirect following. Images use the hosted URL's `=s0` option to retrieve the full-size source instead of its default thumbnail. Screens 1 and 2 are supplied as 1647 x 1107 JPEGs, and screen 3 as a 1647 x 580 JPEG, despite Stitch reporting a 2560 x 2048 canvas for each. Screens 4–9 are PNGs matching their reported dimensions. All downloaded images were decoded successfully and all nine code files were checked for HTML document markup.

The HTML may reference hosted fonts, styling libraries, and image assets and may require an internet connection to render fully.
