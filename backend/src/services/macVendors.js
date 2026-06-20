const MAC_VENDOR_MAP = {
  '00:03:93': { vendor: 'Apple', typeHint: null },
  '00:05:02': { vendor: 'Apple', typeHint: null },
  '00:0A:27': { vendor: 'Apple', typeHint: null },
  '00:16:CB': { vendor: 'Apple', typeHint: null },
  '00:17:F2': { vendor: 'Apple', typeHint: null },
  '00:19:E3': { vendor: 'Apple', typeHint: null },
  '00:1B:63': { vendor: 'Apple', typeHint: null },
  '00:1E:52': { vendor: 'Apple', typeHint: null },
  '00:1F:5B': { vendor: 'Apple', typeHint: null },
  '00:21:E9': { vendor: 'Apple', typeHint: null },
  '00:23:12': { vendor: 'Apple', typeHint: null },
  '00:23:6C': { vendor: 'Apple', typeHint: null },
  '00:24:36': { vendor: 'Apple', typeHint: null },
  '00:25:00': { vendor: 'Apple', typeHint: null },
  '00:25:4B': { vendor: 'Apple', typeHint: null },
  '00:26:08': { vendor: 'Apple', typeHint: null },
  '00:26:B0': { vendor: 'Apple', typeHint: null },
  '04:0C:CE': { vendor: 'Apple', typeHint: 'computer' },
  '04:15:52': { vendor: 'Apple', typeHint: 'phone' },
  '04:54:53': { vendor: 'Apple', typeHint: null },
  '04:69:F8': { vendor: 'Apple', typeHint: null },
  '04:DB:56': { vendor: 'Apple', typeHint: 'phone' },
  '04:EF:C0': { vendor: 'Apple', typeHint: null },
  '04:F4:6F': { vendor: 'Cisco', typeHint: null },
  '06:05:5F': { vendor: 'Sony', typeHint: 'console' },
  '08:00:27': { vendor: 'Oracle', typeHint: 'computer' },
  '08:00:46': { vendor: 'Sony', typeHint: 'console' },
  '08:03:8A': { vendor: 'Brother', typeHint: 'smart_home' },
  '08:05:81': { vendor: 'HP', typeHint: 'smart_home' },
  '08:10:74': { vendor: 'Apple', typeHint: null },
  '08:22:5F': { vendor: 'Apple', typeHint: null },
  '08:36:C9': { vendor: 'Corsair', typeHint: 'computer' },
  '08:4A:CF': { vendor: 'Intel', typeHint: 'computer' },
  '08:60:6E': { vendor: 'Huawei', typeHint: null },
  '08:66:98': { vendor: 'Huawei', typeHint: 'phone' },
  '08:6D:41': { vendor: 'Apple', typeHint: null },
  '08:6E:A0': { vendor: 'Apple', typeHint: null },
  '08:6F:81': { vendor: 'TP-Link', typeHint: 'smart_home' },
  '08:70:77': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '08:74:02': { vendor: 'Sony', typeHint: 'console' },
  '08:77:92': { vendor: 'Xiaomi', typeHint: 'phone' },
  '08:79:73': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '08:7A:15': { vendor: 'Apple', typeHint: null },
  '08:7B:51': { vendor: 'LG', typeHint: 'tv' },
  '08:81:F4': { vendor: 'Apple', typeHint: null },
  '08:82:7A': { vendor: 'Apple', typeHint: null },
  '08:86:3B': { vendor: 'Samsung', typeHint: null },
  '08:8A:20': { vendor: 'Xiaomi', typeHint: 'phone' },
  '08:8F:72': { vendor: 'Apple', typeHint: 'phone' },
  '08:94:EF': { vendor: 'Xiaomi', typeHint: 'phone' },
  '08:95:2A': { vendor: 'Apple', typeHint: null },
  '08:A6:BC': { vendor: 'Samsung', typeHint: 'phone' },
  '08:A6:BD': { vendor: 'Samsung', typeHint: 'phone' },
  '08:AA:86': { vendor: 'Apple', typeHint: null },
  '08:AB:49': { vendor: 'Apple', typeHint: null },
  '08:AC:5A': { vendor: 'Intel', typeHint: 'computer' },
  '08:AE:D6': { vendor: 'Xiaomi', typeHint: 'phone' },
  '08:B5:35': { vendor: 'Sony', typeHint: 'console' },
  '08:B8:17': { vendor: 'Huawei', typeHint: 'phone' },
  '08:BA:6E': { vendor: 'Apple', typeHint: null },
  '08:BB:1A': { vendor: 'Huawei', typeHint: null },
  '08:BE:AC': { vendor: 'Apple', typeHint: null },
  '08:BF:A8': { vendor: 'Intel', typeHint: 'computer' },
  '08:C5:E1': { vendor: 'Xiaomi', typeHint: 'phone' },
  '08:C7:54': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '08:CC:68': { vendor: 'Huawei', typeHint: null },
  '08:CD:7C': { vendor: 'Apple', typeHint: null },
  '08:D0:39': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '08:D4:0B': { vendor: 'Xiaomi', typeHint: 'phone' },
  '08:D4:7A': { vendor: 'Apple', typeHint: null },
  '08:D8:33': { vendor: 'Apple', typeHint: null },
  '08:DC:52': { vendor: 'Samsung', typeHint: 'phone' },
  '08:DD:3C': { vendor: 'Huawei', typeHint: null },
  '08:DF:1F': { vendor: 'Xiaomi', typeHint: 'phone' },
  '08:E0:1C': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '08:E0:82': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '08:E1:59': { vendor: 'Xiaomi', typeHint: 'phone' },
  '08:E2:03': { vendor: 'Huawei', typeHint: null },
  '08:E3:44': { vendor: 'Samsung', typeHint: 'phone' },
  '08:E4:55': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '08:E6:89': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '08:E8:AB': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '08:E9:F6': { vendor: 'Huawei', typeHint: 'phone' },
  '08:EA:40': { vendor: 'Xiaomi', typeHint: 'phone' },
  '08:EB:74': { vendor: 'Intel', typeHint: 'computer' },
  '08:EC:A9': { vendor: 'Xiaomi', typeHint: 'phone' },
  '08:ED:B9': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '08:EE:69': { vendor: 'Xiaomi', typeHint: 'phone' },
  '08:EF:3C': { vendor: 'Intel', typeHint: 'computer' },
  '08:EF:5E': { vendor: 'Apple', typeHint: null },
  '08:F0:74': { vendor: 'Xiaomi', typeHint: 'phone' },
  '08:F1:86': { vendor: 'Huawei', typeHint: null },
  '08:F1:EA': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '08:F3:70': { vendor: 'Apple', typeHint: null },
  '08:F3:8D': { vendor: 'Huawei', typeHint: null },
  '08:F4:1C': { vendor: 'Huawei', typeHint: 'phone' },
  '08:F5:5D': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '08:F5:EA': { vendor: 'Xiaomi', typeHint: 'phone' },
  '08:F6:71': { vendor: 'Huawei', typeHint: null },
  '08:F6:75': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '08:F7:35': { vendor: 'Huawei', typeHint: null },
  '08:F7:B6': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '08:F8:50': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '08:F8:90': { vendor: 'Xiaomi', typeHint: 'phone' },
  '08:F9:E0': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '08:FA:45': { vendor: 'Xiaomi', typeHint: 'phone' },
  '08:FB:6B': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '08:FC:88': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '08:FD:65': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '08:FE:5C': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '08:FF:5A': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '0A:00:27': { vendor: 'Oracle', typeHint: 'computer' },
  '0C:00:74': { vendor: 'Qualcomm', typeHint: 'phone' },
  '0C:1D:AF': { vendor: 'Apple', typeHint: null },
  '0C:2F:B0': { vendor: 'Apple', typeHint: null },
  '0C:30:21': { vendor: 'Apple', typeHint: null },
  '0C:4A:00': { vendor: 'Intel', typeHint: 'computer' },
  '0C:51:01': { vendor: 'Intel', typeHint: 'computer' },
  '0C:54:15': { vendor: 'Apple', typeHint: null },
  '0C:5E:73': { vendor: 'Apple', typeHint: null },
  '0C:60:76': { vendor: 'Apple', typeHint: null },
  '0C:6B:6D': { vendor: 'Intel', typeHint: 'computer' },
  '0C:72:81': { vendor: 'Intel', typeHint: 'computer' },
  '0C:76:03': { vendor: 'Xiaomi', typeHint: 'phone' },
  '0C:7B:9E': { vendor: 'Apple', typeHint: null },
  '0C:82:76': { vendor: 'Apple', typeHint: null },
  '0C:84:7D': { vendor: 'Apple', typeHint: 'phone' },
  '0C:88:69': { vendor: 'Xiaomi', typeHint: 'phone' },
  '0C:89:10': { vendor: 'Apple', typeHint: null },
  '0C:8A:AA': { vendor: 'Samsung', typeHint: 'phone' },
  '0C:8B:32': { vendor: 'Xiaomi', typeHint: 'phone' },
  '0C:8D:F9': { vendor: 'Huawei', typeHint: 'phone' },
  '0C:8E:29': { vendor: 'Apple', typeHint: null },
  '0C:94:EA': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '0C:98:2B': { vendor: 'Samsung', typeHint: 'phone' },
  '0C:9A:3E': { vendor: 'Samsung', typeHint: 'phone' },
  '0C:A0:81': { vendor: 'Cisco', typeHint: null },
  '0C:A4:02': { vendor: 'Google', typeHint: 'phone' },
  '0C:BD:5C': { vendor: 'Apple', typeHint: null },
  '0C:BF:74': { vendor: 'Qualcomm', typeHint: 'phone' },
  '0C:E0:E1': { vendor: 'TP-Link', typeHint: 'smart_home' },
  '0C:E4:2A': { vendor: 'Apple', typeHint: null },
  '0C:EB:9B': { vendor: 'Xiaomi', typeHint: 'phone' },
  '0C:EF:31': { vendor: 'Intel', typeHint: 'computer' },
  '0C:F4:3D': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '0C:F8:DB': { vendor: 'Apple', typeHint: 'phone' },
  '10:00:00': { vendor: 'Cisco', typeHint: null },
  '10:02:B5': { vendor: 'Samsung', typeHint: 'phone' },
  '10:08:31': { vendor: 'HP', typeHint: 'smart_home' },
  '10:0D:7F': { vendor: 'Apple', typeHint: null },
  '10:10:C0': { vendor: 'Tenda', typeHint: 'smart_home' },
  '10:14:F7': { vendor: 'Apple', typeHint: 'phone' },
  '10:1D:C0': { vendor: 'Apple', typeHint: null },
  '10:2A:B3': { vendor: 'Samsung', typeHint: 'phone' },
  '10:30:47': { vendor: 'Xiaomi', typeHint: 'phone' },
  '10:32:08': { vendor: 'TP-Link', typeHint: 'smart_home' },
  '10:3A:E3': { vendor: 'Apple', typeHint: null },
  '10:3C:87': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:40:00': { vendor: 'Huawei', typeHint: null },
  '10:40:F3': { vendor: 'Xiaomi', typeHint: 'phone' },
  '10:41:7F': { vendor: 'Apple', typeHint: null },
  '10:41:E6': { vendor: 'Apple', typeHint: 'phone' },
  '10:42:4F': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:45:24': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:45:46': { vendor: 'Xiaomi', typeHint: 'phone' },
  '10:45:B3': { vendor: 'Xiaomi', typeHint: 'phone' },
  '10:46:43': { vendor: 'Xiaomi', typeHint: 'phone' },
  '10:47:18': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:47:1F': { vendor: 'Xiaomi', typeHint: 'phone' },
  '10:47:90': { vendor: 'Xiaomi', typeHint: 'phone' },
  '10:47:CE': { vendor: 'Xiaomi', typeHint: 'phone' },
  '10:48:01': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:07': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:0D': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:13': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:19': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:1F': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:25': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:2B': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:31': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:37': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:3D': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:43': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:49': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:4F': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:55': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:5B': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:61': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:67': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:6D': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:73': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:79': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:7F': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:85': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:8B': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:91': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:97': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:9D': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:A3': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:A9': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:AF': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:B5': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:BB': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:C1': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:C7': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:CD': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:D3': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:D9': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:DF': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:E5': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:EB': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:F1': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:F7': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:48:FD': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:4B:3C': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:4C:43': { vendor: 'Intel', typeHint: 'computer' },
  '10:4D:81': { vendor: 'Huawei', typeHint: null },
  '10:4E:AA': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:4F:03': { vendor: 'Apple', typeHint: 'phone' },
  '10:50:09': { vendor: 'Xiaomi', typeHint: 'phone' },
  '10:50:43': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:50:CD': { vendor: 'Xiaomi', typeHint: 'phone' },
  '10:51:35': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:51:60': { vendor: 'Huawei', typeHint: null },
  '10:51:72': { vendor: 'Xiaomi', typeHint: 'phone' },
  '10:51:B7': { vendor: 'Xiaomi', typeHint: 'phone' },
  '10:52:1C': { vendor: 'Xiaomi', typeHint: 'phone' },
  '10:52:1F': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:52:5C': { vendor: 'Xiaomi', typeHint: 'phone' },
  '10:52:79': { vendor: 'Xiaomi', typeHint: 'phone' },
  '10:52:85': { vendor: 'Xiaomi', typeHint: 'phone' },
  '10:52:B3': { vendor: 'Huawei', typeHint: null },
  '10:52:EB': { vendor: 'Xiaomi', typeHint: 'phone' },
  '10:53:00': { vendor: 'Apple', typeHint: null },
  '10:53:CC': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:54:12': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:54:56': { vendor: 'Xiaomi', typeHint: 'phone' },
  '10:54:B0': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:54:F3': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:55:03': { vendor: 'Xiaomi', typeHint: 'phone' },
  '10:55:42': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:55:6B': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:55:99': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:55:B9': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:55:CC': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:55:E9': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:56:00': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:56:1F': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:56:3E': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:56:5D': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:56:7C': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:56:9B': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:56:BA': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:56:D9': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:56:F8': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:57:17': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:57:36': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:57:55': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:57:74': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:57:93': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:57:B2': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:57:D1': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:57:F0': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:58:0F': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:58:2E': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:58:4D': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:58:6C': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:58:8B': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:58:AA': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:58:C9': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:58:E8': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:59:07': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:59:26': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:59:45': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:59:64': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:59:83': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:59:A2': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:59:C1': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:59:E0': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:59:FF': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5A:1F': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5A:3E': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5A:5D': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5A:7C': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5A:9B': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5A:BA': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5A:D9': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5A:F8': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5B:17': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5B:36': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5B:55': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5B:74': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5B:93': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5B:B2': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5B:D1': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5B:F0': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5C:0F': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5C:2E': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5C:4D': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5C:6C': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5C:8B': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5C:AA': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5C:C9': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5C:E8': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5D:07': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5D:26': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5D:45': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5D:64': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5D:83': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5D:A2': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5D:C1': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5D:E0': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5D:FF': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5E:1F': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5E:3E': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5E:5D': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5E:7C': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5E:9B': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5E:BA': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5E:D9': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5E:F8': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5F:17': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5F:36': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5F:55': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5F:74': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5F:93': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5F:B2': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5F:D1': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:5F:F0': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:60:0F': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:60:2E': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:60:4D': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:60:6C': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:60:8B': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:60:AA': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:60:C9': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:60:E8': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:61:07': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:61:26': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:61:45': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:61:64': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:61:83': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:61:A2': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:61:C1': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:61:E0': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:61:FF': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:62:1F': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:62:3E': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:62:5D': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:62:7C': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:62:9B': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:62:BA': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:62:D9': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:62:F8': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:63:17': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:63:36': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:63:55': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:63:74': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:63:93': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:63:B2': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:63:D1': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:63:F0': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:64:0F': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:64:2E': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:64:4D': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:64:6C': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:64:8B': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:64:AA': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:64:C9': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:64:E8': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:65:07': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:65:26': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:65:45': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:65:64': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:65:83': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:65:A2': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:65:C1': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:65:E0': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:65:FF': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:66:1F': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:66:3E': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:66:5D': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:66:7C': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:66:9B': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:66:BA': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:66:D9': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:66:F8': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:67:17': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:67:36': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:67:55': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:67:74': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:67:93': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:67:B2': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:67:D1': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:67:F0': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:68:0F': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:68:2E': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:68:4D': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:68:6C': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:68:8B': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:68:AA': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:68:C9': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:68:E8': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:69:07': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:69:26': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:69:45': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:69:64': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:69:83': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:69:A2': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:69:C1': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:69:E0': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:69:FF': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6A:1F': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6A:3E': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6A:5D': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6A:7C': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6A:9B': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6A:BA': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6A:D9': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6A:F8': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6B:17': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6B:36': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6B:55': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6B:74': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6B:93': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6B:B2': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6B:D1': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6B:F0': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6C:0F': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6C:2E': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6C:4D': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6C:6C': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6C:8B': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6C:AA': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6C:C9': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6C:E8': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6D:07': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6D:26': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6D:45': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6D:64': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6D:83': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6D:A2': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6D:C1': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6D:E0': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6D:FF': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6E:1F': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6E:3E': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6E:5D': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6E:7C': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6E:9B': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6E:BA': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6E:D9': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6E:F8': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6F:17': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6F:36': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6F:55': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6F:74': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6F:93': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6F:B2': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6F:D1': { vendor: 'Xiaomi', typeHint: 'smart_home' },
  '10:6F:F0': { vendor: 'Xiaomi', typeHint: 'smart_home' }
};

function normalizeMac(mac) {
  if (!mac || typeof mac !== 'string') return null;
  let normalized = mac.toUpperCase().trim().replace(/[^A-F0-9]/g, '');
  if (normalized.length !== 12) return null;
  return normalized.match(/.{2}/g).join(':');
}

function getOui(mac) {
  const normalized = normalizeMac(mac);
  return normalized ? normalized.substring(0, 8) : null;
}

function getVendor(mac) {
  const oui = getOui(mac);
  if (!oui) return 'Unknown';
  const entry = MAC_VENDOR_MAP[oui];
  if (entry) return entry.vendor;
  const partialKeys = Object.keys(MAC_VENDOR_MAP).filter(key =>
    oui.startsWith(key.substring(0, 6))
  );
  if (partialKeys.length > 0) return MAC_VENDOR_MAP[partialKeys[0]].vendor;
  return 'Unknown';
}

function inferDeviceType(mac, additionalInfo = {}) {
  const { hostname = '', vendor = '', osInfo = '' } = additionalInfo;
  const oui = getOui(mac);
  let typeHint = null;
  if (oui) {
    const entry = MAC_VENDOR_MAP[oui];
    if (entry && entry.typeHint) typeHint = entry.typeHint;
  }
  const resolvedVendor = vendor || getVendor(mac);
  const hl = hostname.toLowerCase();
  const vl = resolvedVendor.toLowerCase();
  const ol = osInfo.toLowerCase();

  if (hl.includes('iphone') || hl.includes('ipod')) return 'phone';
  if (hl.includes('ipad')) return 'tablet';
  if (hl.includes('macbook') || hl.includes('imac') || hl.includes('mac-mini') ||
      hl.includes('macpro') || hl.includes('mac mini') || hl.includes('mac pro')) {
    return 'computer';
  }
  if (ol.includes('windows') || ol.includes('mac os') || ol.includes('macos') ||
      ol.includes('linux') || ol.includes('ubuntu') || ol.includes('debian') ||
      ol.includes('fedora')) {
    return 'computer';
  }
  if (ol.includes('android') && !hl.includes('tv') && !hl.includes('box')) return 'phone';
  if (ol.includes('ios') && !hl.includes('pad')) return 'phone';
  if (ol.includes('ios') && hl.includes('pad')) return 'tablet';
  if (hl.includes('tv') || hl.includes('apple tv') || hl.includes('miracast') ||
      hl.includes('chromecast') || hl.includes('fire tv') || hl.includes('firestick') ||
      hl.includes('tv box') || hl.includes('roku')) {
    return 'tv';
  }
  if (vl.includes('roku') || vl.includes('chromecast')) return 'tv';
  if (hl.includes('playstation') || hl.includes('ps4') || hl.includes('ps5') ||
      hl.includes('ps3') || hl.includes('xbox') || hl.includes('nintendo') ||
      hl.includes('switch') || hl.includes('wii')) {
    return 'console';
  }
  if (vl.includes('nintendo')) return 'console';
  if (hl.includes('alexa') || hl.includes('echo') || hl.includes('amazon echo') ||
      hl.includes('google home') || hl.includes('google nest') || hl.includes('nest hub') ||
      hl.includes('homepod')) {
    return 'smart_home';
  }
  if (hl.includes('smart bulb') || hl.includes('smart light') || hl.includes('yeelight') ||
      hl.includes('philips hue') || hl.includes('hue bridge') ||
      hl.includes('smart plug') || hl.includes('tuya') || hl.includes('sonoff')) {
    return 'smart_home';
  }
  if (hl.includes('camera') || hl.includes('ipcam') || hl.includes('wyze') ||
      hl.includes('yi home')) {
    return 'smart_home';
  }
  if (hl.includes('thermostat') || hl.includes('nest') || hl.includes('ecobee')) {
    return 'smart_home';
  }
  if (hl.includes('smart watch') || hl.includes('watch') || hl.includes('galaxy watch') ||
      hl.includes('apple watch')) {
    return 'phone';
  }
  if (hl.includes('kindle') || hl.includes('tablet') || hl.includes('galaxy tab') ||
      hl.includes('tab s') || hl.includes('ipad')) {
    return 'tablet';
  }
  if (hl.includes('router') || hl.includes('gateway') || hl.includes('modem') ||
      hl.includes('access point') || hl.includes('ap-') || hl.includes('repeater') ||
      hl.includes('extender')) {
    return 'smart_home';
  }
  if (hl.includes('printer') || vl.includes('brother') || vl.includes('canon') ||
      vl.includes('epson')) {
    return 'smart_home';
  }
  if (vl.includes('apple')) {
    if (typeHint) return typeHint;
    return 'computer';
  }
  if (vl.includes('samsung')) {
    if (typeHint) return typeHint;
    return 'phone';
  }
  if (vl.includes('xiaomi') || vl.includes('mi ')) {
    if (typeHint) return typeHint;
    return 'smart_home';
  }
  if (vl.includes('huawei')) {
    if (typeHint) return typeHint;
    return 'phone';
  }
  if (vl.includes('intel') || vl.includes('nvidia') || vl.includes('amd') ||
      vl.includes('realtek') || vl.includes('broadcom') || vl.includes('marvell')) {
    return 'computer';
  }
  if (vl.includes('tp-link') || vl.includes('netgear') || vl.includes('linksys') ||
      vl.includes('asus') || vl.includes('dlink') || vl.includes('d-link') ||
      vl.includes('tenda') || vl.includes('cisco') || vl.includes('ubiquiti')) {
    return 'smart_home';
  }
  if (vl.includes('google')) {
    if (typeHint) return typeHint;
    return 'phone';
  }
  if (vl.includes('sony')) {
    if (typeHint) return typeHint;
    return 'tv';
  }
  if (vl.includes('lg')) {
    if (typeHint) return typeHint;
    return 'tv';
  }
  if (vl.includes('oneplus') || vl.includes('oppo') || vl.includes('vivo') ||
      vl.includes('meizu') || vl.includes('zte')) {
    return 'phone';
  }
  if (vl.includes('microsoft')) return 'computer';
  if (vl.includes('dell') || vl.includes('hp') || vl.includes('lenovo') ||
      vl.includes('acer') || vl.includes('asus') || vl.includes('msi') ||
      vl.includes('razer')) {
    return 'computer';
  }
  if (typeHint) return typeHint;
  return 'unknown';
}

module.exports = {
  MAC_VENDOR_MAP,
  normalizeMac,
  getOui,
  getVendor,
  inferDeviceType
};
