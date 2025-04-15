# Hướng dẫn kiểm thử Rate Limiter và Time Limiter với Postman

File `rate-time-limiter-test.postman_collection.json` chứa các request được sắp xếp theo thứ tự để kiểm thử Rate Limiter và Time Limiter Pattern. Dưới đây là hướng dẫn chi tiết cách thực hiện kiểm thử.

## Chuẩn bị

1. Đảm bảo cả hai service đều đang chạy:
   - Order Service trên cổng 3000
   - Inventory Service trên cổng 3001

2. Import collection vào Postman:
   - Mở Postman
   - Nhấn nút "Import"
   - Chọn file `rate-time-limiter-test.postman_collection.json`
   - Nhấn "Import"

## Kiểm thử Rate Limiter

Rate Limiter giới hạn số lượng request trong một khoảng thời gian nhất định, bảo vệ service khỏi quá tải.

### Bước 1: Kiểm tra Simple Rate Limiter với 10 requests

1. Chạy request "1. Test Simple Rate Limiter (10 requests)"
2. Quan sát kết quả:
   - Tất cả 10 requests sẽ được xử lý, nhưng với tốc độ bị giới hạn (5 requests/10 giây)
   - Thời gian hoàn thành sẽ khoảng 20 giây
   - Response sẽ hiển thị rõ ràng thời gian xử lý của từng request và thời điểm xử lý
   - Bạn sẽ thấy các request được xử lý cách nhau khoảng 2 giây
3. Quan sát log trong console của Order Service:
   - Bạn sẽ thấy log với timestamp của từng request
   - Các timestamp sẽ cách nhau khoảng 2 giây
4. Mục đích: Thấy rõ cách Rate Limiter giới hạn tốc độ gửi request

### Bước 2: Kiểm tra Rate Limiter với 10 requests

1. Chạy request "2. Test Rate Limiter (10 requests)"
2. Quan sát kết quả:
   - Tất cả 10 requests sẽ được xử lý, nhưng với tốc độ bị giới hạn (5 requests/10 giây)
   - Thời gian hoàn thành sẽ khoảng 20 giây
   - Bạn sẽ thấy thống kê về số lượng requests đang chạy, trong hàng đợi và đã hoàn thành
3. Quan sát log trong console của cả hai service:
   - Trong Order Service, bạn sẽ thấy log về việc các request được lên lịch và thực thi
   - Trong Inventory Service, bạn sẽ thấy log về việc các request được nhận và xử lý
4. Mục đích: Thấy cách Rate Limiter giới hạn tốc độ gửi request

### Bước 2: Kiểm tra Rate Limiter với 20 requests

1. Chạy request "2. Test Rate Limiter (20 requests)"
2. Quan sát kết quả:
   - Tất cả 20 requests sẽ được xử lý, nhưng với tốc độ bị giới hạn
   - Thời gian hoàn thành sẽ khoảng 40 giây
   - Bạn sẽ thấy một số request phải đợi trong hàng đợi
3. Mục đích: Thấy cách Rate Limiter xử lý khi số lượng request tăng lên

### Bước 3: Kiểm tra Rate Limiter với 30 requests

1. Chạy request "3. Test Rate Limiter (30 requests)"
2. Quan sát kết quả:
   - Một số request có thể bị từ chối do vượt quá giới hạn hàng đợi (highWater = 10)
   - Bạn sẽ thấy lỗi "Task was rejected" khi hàng đợi đầy
   - Bạn sẽ thấy log về việc request bị drop trong console của Order Service
3. Mục đích: Thấy cách Rate Limiter xử lý khi số lượng request vượt quá giới hạn hàng đợi

## Kiểm thử Time Limiter

Time Limiter đặt thời gian chờ cho các request, ngăn chặn các request chậm chiếm dụng tài nguyên quá lâu.

### Bước 1: Kiểm tra endpoint có độ trễ

1. Chạy request "1. Test Delay Endpoint (3s)"
2. Quan sát kết quả:
   - Request sẽ mất khoảng 3 giây để hoàn thành
   - Response sẽ chứa thông tin về độ trễ
3. Mục đích: Hiểu cách endpoint có độ trễ hoạt động

### Bước 2: Kiểm tra Time Limiter khi timeout lớn hơn delay

1. Chạy request "2. Test Time Limiter (Success: timeout=5s, delay=3s)"
2. Quan sát kết quả:
   - Request sẽ hoàn thành thành công vì timeout (5s) lớn hơn delay (3s)
   - Response sẽ có status 200 và chứa dữ liệu từ endpoint có độ trễ
3. Mục đích: Thấy cách Time Limiter xử lý khi request hoàn thành trong thời gian timeout

### Bước 3: Kiểm tra Time Limiter khi timeout nhỏ hơn delay

1. Chạy request "3. Test Time Limiter (Timeout: timeout=2s, delay=5s)"
2. Quan sát kết quả:
   - Request sẽ bị timeout vì timeout (2s) nhỏ hơn delay (5s)
   - Response sẽ có status 408 (Request Timeout) và chứa thông báo lỗi
3. Quan sát log trong console:
   - Trong Order Service, bạn sẽ thấy log về việc request bị timeout
   - Trong Inventory Service, request vẫn đang được xử lý nhưng client đã ngắt kết nối
4. Mục đích: Thấy cách Time Limiter xử lý khi request không hoàn thành trong thời gian timeout

## Kiểm thử kết hợp tất cả các mẫu thiết kế khả năng phục hồi

### Bước 1: Kiểm tra tất cả các mẫu thiết kế cùng nhau

1. Chạy request "1. Test All Resilience Patterns Together"
2. Quan sát kết quả:
   - Request sẽ sử dụng tất cả các mẫu thiết kế: Circuit Breaker, Retry, Rate Limiter và Time Limiter
   - Nếu request thành công, response sẽ có status 200
   - Nếu request thất bại, response sẽ có status 500 và chứa thông báo lỗi
3. Quan sát log trong console:
   - Bạn sẽ thấy log về việc các mẫu thiết kế hoạt động cùng nhau
4. Mục đích: Thấy cách các mẫu thiết kế khả năng phục hồi hoạt động cùng nhau

## Những điểm cần chú ý

1. **Rate Limiter**:
   - Giới hạn số lượng request đồng thời (maxConcurrent = 2)
   - Giới hạn tốc độ gửi request (minTime = 2000ms, tương đương 5 requests/10 giây)
   - Giới hạn số lượng request trong hàng đợi (highWater = 10)
   - Chiến lược BLOCK: Khi hàng đợi đầy, từ chối request mới

2. **Time Limiter**:
   - Đặt thời gian chờ cho các request
   - Ngắt kết nối khi request không hoàn thành trong thời gian timeout
   - Trả về lỗi TimeoutError khi request bị timeout

3. **Kết hợp các mẫu thiết kế**:
   - Circuit Breaker: Ngăn chặn request đến service đang gặp sự cố
   - Retry: Tự động thử lại các request thất bại
   - Rate Limiter: Giới hạn số lượng và tốc độ gửi request
   - Time Limiter: Đặt thời gian chờ cho các request

## Kết luận

Thông qua các bước kiểm thử này, bạn có thể thấy cách Rate Limiter và Time Limiter hoạt động và cách chúng kết hợp với các mẫu thiết kế khả năng phục hồi khác để tăng khả năng phục hồi của hệ thống. Các mẫu thiết kế này giúp:

1. Bảo vệ service khỏi quá tải
2. Ngăn chặn các request chậm chiếm dụng tài nguyên quá lâu
3. Tăng khả năng phục hồi của hệ thống khi có sự cố
4. Cải thiện trải nghiệm người dùng khi có lỗi
