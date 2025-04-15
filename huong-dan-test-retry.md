# Hướng dẫn kiểm thử Retry Pattern với Postman

File `retry-test.postman_collection.json` chứa các request được sắp xếp theo thứ tự để kiểm thử Retry Pattern. Dưới đây là hướng dẫn chi tiết cách thực hiện kiểm thử.

## Chuẩn bị

1. Đảm bảo cả hai service đều đang chạy:
   - Order Service trên cổng 3000
   - Inventory Service trên cổng 3001

2. Import collection vào Postman:
   - Mở Postman
   - Nhấn nút "Import"
   - Chọn file `retry-test.postman_collection.json`
   - Nhấn "Import"

## Các bước kiểm thử

### Bước 1: Hiểu cách hoạt động của endpoint flaky

1. Chạy request "1. Kiểm tra endpoint flaky trực tiếp" vài lần
2. Quan sát kết quả:
   - Khoảng 30% request sẽ thành công với status 200 và message "Service is working correctly"
   - Khoảng 70% request sẽ thất bại với status 500 và message "Random server error for testing"
   - Mỗi request sẽ có một requestId và timestamp khác nhau
   - Bạn sẽ thấy log chi tiết trong console của Inventory Service
3. Mục đích: Hiểu cách endpoint flaky hoạt động trước khi kiểm thử Retry Pattern

### Bước 2: Kiểm tra Retry Pattern

1. Chạy request "2. Kiểm tra Retry Pattern"
2. Quan sát kết quả:
   - Nếu request thành công ngay lần đầu, bạn sẽ thấy response với status 200
   - Nếu request thất bại ban đầu nhưng thành công sau khi retry, bạn vẫn sẽ thấy response với status 200
   - Nếu tất cả các lần retry đều thất bại, bạn sẽ thấy response với status 500
3. Quan sát log trong console của cả hai service:
   - Trong Order Service, bạn sẽ thấy log về việc retry với cùng một requestId
   - Trong Inventory Service, bạn sẽ thấy nhiều log với cùng một requestId, cho thấy request được gọi nhiều lần
4. Mục đích: Thấy cách Retry Pattern tự động thử lại các request thất bại

### Bước 3: Kiểm tra kết hợp Retry và Circuit Breaker

1. Chạy request "3. Kiểm tra Retry với Circuit Breaker" nhiều lần
2. Quan sát kết quả:
   - Ban đầu, Retry Pattern sẽ thử lại các request thất bại
   - Nếu nhiều request liên tiếp thất bại (kể cả sau khi retry), Circuit Breaker sẽ mở
   - Khi Circuit Breaker mở, các request tiếp theo sẽ thất bại ngay lập tức mà không cần gọi đến service thực tế
3. Quan sát log trong console:
   - Bạn sẽ thấy log về việc retry và trạng thái của Circuit Breaker
   - Khi Circuit Breaker mở, bạn sẽ không thấy log trong Inventory Service vì request không được chuyển tiếp
4. Mục đích: Thấy cách Retry Pattern và Circuit Breaker hoạt động cùng nhau

## Những điểm cần chú ý

1. **Retry Pattern**:
   - Tự động thử lại các request thất bại với độ trễ tăng dần (exponential backoff)
   - Chỉ thử lại các lỗi 5xx, không thử lại các lỗi 4xx
   - Có giới hạn số lần thử lại (trong demo này là 3 lần)

2. **Kết hợp với Circuit Breaker**:
   - Retry Pattern thử lại các request thất bại
   - Nếu tất cả các lần retry đều thất bại, Circuit Breaker sẽ tính là một lần thất bại
   - Sau một số lần thất bại, Circuit Breaker sẽ mở để ngăn chặn các request tiếp theo

3. **Lợi ích của Retry Pattern**:
   - Tăng khả năng thành công của request khi có lỗi tạm thời
   - Giảm tác động của các lỗi tạm thời đến người dùng
   - Kết hợp với Circuit Breaker để tránh quá tải service khi có lỗi kéo dài

## Kết luận

Thông qua các bước kiểm thử này, bạn có thể thấy cách Retry Pattern hoạt động và cách nó kết hợp với Circuit Breaker để tăng khả năng phục hồi của hệ thống. Retry Pattern giúp:

1. Tự động thử lại các request thất bại do lỗi tạm thời
2. Tăng khả năng thành công của request
3. Giảm tác động của các lỗi tạm thời đến người dùng
4. Kết hợp với Circuit Breaker để bảo vệ hệ thống khỏi quá tải
