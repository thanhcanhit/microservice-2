# Microservices Resilience Patterns Demo

Dự án này demo các mẫu thiết kế khả năng phục hồi (resilience patterns) trong kiến trúc microservices, bao gồm:

1. Circuit Breaker
2. Retry
3. Rate Limiter
4. Time Limiter

## Cấu trúc dự án

```
microservice-2/
├── order-service/       # Service quản lý đơn hàng
├── inventory-service/   # Service quản lý kho hàng
├── circuit-breaker-test.postman_collection.json  # Collection Postman để test
├── huong-dan-test-circuit-breaker.md             # Hướng dẫn test
└── test-circuit-breaker.js                       # Script test tự động
```

## Cài đặt và chạy

1. Cài đặt dependencies cho cả hai service:
   ```
   cd order-service
   npm install
   
   cd ../inventory-service
   npm install
   ```

2. Khởi động cả hai service:
   ```
   # Terminal 1
   cd inventory-service
   npm start
   
   # Terminal 2
   cd order-service
   npm start
   ```

## Cấu hình Circuit Breaker

Circuit Breaker được cấu hình với các tham số sau:

```javascript
const circuitBreakerOptions = {
  failureThreshold: 2,           // Số lần thất bại trước khi mở circuit
  resetTimeout: 20000,           // Thời gian chờ trước khi thử lại (20 giây)
  timeout: 5000,                 // Thời gian chờ trước khi request bị coi là thất bại
  errorThresholdPercentage: 50,  // Ngưỡng phần trăm lỗi để kích hoạt circuit
  rollingCountTimeout: 60000,    // Cửa sổ thời gian để theo dõi tỷ lệ lỗi (1 phút)
  rollingCountBuckets: 10        // Số bucket để theo dõi tỷ lệ lỗi
};
```

## Kiểm thử

Có hai cách để kiểm thử Circuit Breaker:

1. **Sử dụng Postman**:
   - Import file `circuit-breaker-test.postman_collection.json`
   - Làm theo hướng dẫn trong file `huong-dan-test-circuit-breaker.md`

2. **Sử dụng script test**:
   ```
   npm install axios
   node test-circuit-breaker.js
   ```

## Các trạng thái của Circuit Breaker

1. **Closed**: Tất cả request đều được chuyển đến service thực tế
2. **Open**: Tất cả request đều bị từ chối ngay lập tức, không gọi đến service thực tế
3. **Half-Open**: Cho phép một số request thử nghiệm để kiểm tra xem service đã phục hồi chưa

## Logging

Cả hai service đều sử dụng Morgan để logging HTTP requests. Khi Circuit Breaker mở, bạn sẽ không thấy log trong Inventory Service vì request không được chuyển tiếp.

## Cơ chế Fallback

Khi tạo đơn hàng trong lúc Inventory Service không khả dụng, hệ thống vẫn tạo đơn hàng với trạng thái "pending" thay vì "confirmed". Đây là cơ chế fallback giúp hệ thống vẫn hoạt động khi service phụ thuộc gặp sự cố.
