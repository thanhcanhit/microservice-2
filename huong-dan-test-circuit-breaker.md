# Hướng dẫn kiểm thử Circuit Breaker với Postman

File `circuit-breaker-test.postman_collection.json` chứa các request được sắp xếp theo thứ tự để kiểm thử Circuit Breaker pattern. Dưới đây là hướng dẫn chi tiết cách thực hiện kiểm thử.

## Chuẩn bị

1. Đảm bảo cả hai service đều đang chạy:
   - Order Service trên cổng 3000
   - Inventory Service trên cổng 3001

2. Import collection vào Postman:
   - Mở Postman
   - Nhấn nút "Import"
   - Chọn file `circuit-breaker-test.postman_collection.json`
   - Nhấn "Import"

## Các bước kiểm thử

### Bước 1: Kiểm tra trạng thái ban đầu của Circuit Breaker

1. Chạy request "1. Kiểm tra trạng thái Circuit Breaker ban đầu"
2. Quan sát kết quả:
   - Trạng thái của tất cả các circuit nên là "closed"
   - Các thống kê (successful, failed, rejected, timeout) nên đều bằng 0

### Bước 2: Hiểu cách hoạt động của endpoint flaky

1. Chạy request "2. Kiểm tra endpoint flaky trực tiếp" vài lần
2. Quan sát kết quả:
   - Khoảng 30% request sẽ thành công với status 200 và message "Service is working correctly"
   - Khoảng 70% request sẽ thất bại với status 500 và message "Random server error for testing"
   - Bạn cũng sẽ thấy log chi tiết trong console của Inventory Service
3. Mục đích: Hiểu cách endpoint flaky hoạt động trước khi kiểm thử thông qua Circuit Breaker

### Bước 3: Kích hoạt Circuit Breaker

1. Chạy request "3. Kích hoạt Circuit Breaker (chạy nhiều lần)" liên tục khoảng 5-10 lần
2. Quan sát kết quả:
   - Ban đầu, một số request sẽ thành công, một số sẽ thất bại
   - Sau khoảng 2-3 lần thất bại, tất cả các request tiếp theo sẽ thất bại ngay lập tức
   - Lỗi sẽ trả về ngay mà không cần gọi đến service thực tế
   - Bạn sẽ thấy log chi tiết trong console của Order Service
   - Chú ý: Khi Circuit Breaker mở, bạn sẽ không thấy log trong Inventory Service vì request không được chuyển tiếp
3. Mục đích: Kích hoạt Circuit Breaker để chuyển từ trạng thái "closed" sang "open"

### Bước 4: Kiểm tra trạng thái Circuit Breaker sau khi kích hoạt

1. Chạy request "4. Kiểm tra trạng thái Circuit Breaker sau khi kích hoạt"
2. Quan sát kết quả:
   - Trạng thái của flakyTest circuit nên là "open"
   - Số lượng failed và rejected nên tăng lên
3. Mục đích: Xác nhận Circuit Breaker đã chuyển sang trạng thái "open"

### Bước 5: Tạo đơn hàng khi Circuit Breaker đang mở

1. Chạy request "5. Tạo đơn hàng khi Circuit Breaker đang mở"
2. Quan sát kết quả:
   - Đơn hàng vẫn được tạo nhưng với trạng thái "pending" thay vì "confirmed"
   - Response sẽ có status 202 (Accepted) thay vì 201 (Created)
   - Message sẽ thông báo "Order created with pending status. Inventory service is currently unavailable."
3. Mục đích: Kiểm tra cơ chế fallback khi service phụ thuộc không khả dụng

### Bước 6: Kiểm tra đơn hàng đã tạo

1. Chạy request "6. Kiểm tra đơn hàng đã tạo"
2. Quan sát kết quả:
   - Đơn hàng mới tạo sẽ có trạng thái "pending"
3. Mục đích: Xác nhận đơn hàng đã được tạo với trạng thái phù hợp

### Bước 7: Kiểm tra tự phục hồi của Circuit Breaker

1. Đợi khoảng 20 giây (thời gian resetTimeout đã cấu hình)
2. Chạy lại request "4. Kiểm tra trạng thái Circuit Breaker sau khi kích hoạt"
3. Quan sát kết quả:
   - Trạng thái có thể đã chuyển sang "half-open"
4. Chạy lại request "3. Kích hoạt Circuit Breaker (chạy nhiều lần)"
5. Quan sát kết quả:
   - Nếu request thành công, Circuit Breaker sẽ chuyển về trạng thái "closed"
   - Nếu request thất bại, Circuit Breaker sẽ tiếp tục ở trạng thái "open"
6. Mục đích: Kiểm tra cơ chế tự phục hồi của Circuit Breaker

## Những điểm cần chú ý

1. **Trạng thái Circuit Breaker**:
   - **Closed**: Tất cả request đều được chuyển đến service thực tế
   - **Open**: Tất cả request đều bị từ chối ngay lập tức, không gọi đến service thực tế
   - **Half-Open**: Cho phép một số request thử nghiệm để kiểm tra xem service đã phục hồi chưa

2. **Thống kê Circuit Breaker**:
   - **Successful**: Số lượng request thành công
   - **Failed**: Số lượng request thất bại
   - **Rejected**: Số lượng request bị từ chối khi circuit đang open
   - **Timeout**: Số lượng request bị timeout

3. **Cơ chế Fallback**:
   - Khi tạo đơn hàng trong lúc Inventory Service không khả dụng, hệ thống vẫn tạo đơn hàng với trạng thái "pending"
   - Đây là cơ chế fallback giúp hệ thống vẫn hoạt động khi service phụ thuộc gặp sự cố

## Kết luận

Thông qua các bước kiểm thử này, bạn có thể thấy rõ cách Circuit Breaker hoạt động và bảo vệ hệ thống của bạn khỏi các lỗi cascade khi một service phụ thuộc gặp sự cố. Circuit Breaker giúp:

1. Ngăn chặn các request đến service đang gặp sự cố
2. Giảm tải cho service đang gặp sự cố, cho phép nó phục hồi
3. Cung cấp cơ chế fallback để hệ thống vẫn hoạt động khi service phụ thuộc không khả dụng
4. Tự động phục hồi khi service phụ thuộc trở lại bình thường
