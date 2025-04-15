# Microservices Resilience Patterns Demo

Dự án này demo các mẫu thiết kế khả năng phục hồi (resilience patterns) trong kiến trúc microservices, bao gồm:

1. **Circuit Breaker**: Ngăn chặn request đến service đang gặp sự cố
2. **Retry**: Tự động thử lại các request thất bại
3. **Rate Limiter**: Giới hạn số lượng và tốc độ gửi request
4. **Time Limiter**: Đặt thời gian chờ cho các request

## Cấu trúc dự án

```
microservice-2/
├── order-service/       # Service quản lý đơn hàng
├── inventory-service/   # Service quản lý kho hàng
├── circuit-breaker-test.postman_collection.json  # Collection Postman để test Circuit Breaker
├── retry-test.postman_collection.json           # Collection Postman để test Retry
├── rate-time-limiter-test.postman_collection.json # Collection Postman để test Rate Limiter và Time Limiter
├── huong-dan-test-circuit-breaker.md            # Hướng dẫn test Circuit Breaker
├── huong-dan-test-retry.md                      # Hướng dẫn test Retry
├── huong-dan-test-rate-time-limiter.md          # Hướng dẫn test Rate Limiter và Time Limiter
└── test-circuit-breaker.js                      # Script test tự động cho Circuit Breaker
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

## Cấu hình các mẫu thiết kế

### Circuit Breaker

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

### Retry

```javascript
axiosRetry(axios, {
  retries: 3,                    // Số lần thử lại
  retryDelay: (retryCount) => {
    return retryCount * 1000;     // Độ trễ tăng dần: 1s, 2s, 3s
  },
  retryCondition: (error) => {
    // Chỉ thử lại các lỗi 5xx, không thử lại các lỗi 4xx
    return isNetworkOrIdempotentRequestError(error) ||
           (error.response && error.response.status >= 500);
  }
});
```

### Rate Limiter

```javascript
const limiter = new Bottleneck({
  maxConcurrent: 2,              // Số lượng request đồng thời tối đa
  minTime: 2000,                 // Thời gian tối thiểu giữa các request (5 requests/10 giây)
  highWater: 10,                 // Số lượng request tối đa trong hàng đợi
  strategy: Bottleneck.strategy.BLOCK, // Khi hàng đợi đầy, từ chối request mới
});
```

### Time Limiter

```javascript
const timeoutRequest = (promise, timeoutMs = 3000, errorMessage = 'Request timed out') => {
  return pTimeout(promise, {
    milliseconds: timeoutMs,
    message: errorMessage
  });
};
```

## Kiểm thử

### Circuit Breaker

1. **Sử dụng Postman**:
   - Import file `circuit-breaker-test.postman_collection.json`
   - Làm theo hướng dẫn trong file `huong-dan-test-circuit-breaker.md`

2. **Sử dụng script test**:
   ```
   npm install axios
   node test-circuit-breaker.js
   ```

### Retry

- Import file `retry-test.postman_collection.json`
- Làm theo hướng dẫn trong file `huong-dan-test-retry.md`

### Rate Limiter và Time Limiter

- Import file `rate-time-limiter-test.postman_collection.json`
- Làm theo hướng dẫn trong file `huong-dan-test-rate-time-limiter.md`

## Các trạng thái và đặc điểm

### Circuit Breaker

1. **Closed**: Tất cả request đều được chuyển đến service thực tế
2. **Open**: Tất cả request đều bị từ chối ngay lập tức, không gọi đến service thực tế
3. **Half-Open**: Cho phép một số request thử nghiệm để kiểm tra xem service đã phục hồi chưa

### Retry

- Tự động thử lại các request thất bại với độ trễ tăng dần
- Chỉ thử lại các lỗi 5xx, không thử lại các lỗi 4xx
- Có giới hạn số lần thử lại

### Rate Limiter

- Giới hạn số lượng request đồng thời
- Giới hạn tốc độ gửi request
- Giới hạn số lượng request trong hàng đợi
- Có chiến lược xử lý khi hàng đợi đầy

### Time Limiter

- Đặt thời gian chờ cho các request
- Ngắt kết nối khi request không hoàn thành trong thời gian timeout
- Trả về lỗi TimeoutError khi request bị timeout

## Logging

Cả hai service đều sử dụng Morgan để logging HTTP requests. Các log giúp theo dõi hoạt động của các mẫu thiết kế khả năng phục hồi:

- Khi Circuit Breaker mở, bạn sẽ không thấy log trong Inventory Service vì request không được chuyển tiếp
- Khi Retry hoạt động, bạn sẽ thấy log về các lần thử lại với cùng một requestId
- Khi Rate Limiter hoạt động, bạn sẽ thấy log về việc các request được lên lịch và thực thi
- Khi Time Limiter hoạt động, bạn sẽ thấy log về việc request bị timeout

## Cơ chế Fallback và lợi ích

### Cơ chế Fallback

Khi tạo đơn hàng trong lúc Inventory Service không khả dụng, hệ thống vẫn tạo đơn hàng với trạng thái "pending" thay vì "confirmed". Đây là cơ chế fallback giúp hệ thống vẫn hoạt động khi service phụ thuộc gặp sự cố.

### Lợi ích của các mẫu thiết kế khả năng phục hồi

1. **Circuit Breaker**: Ngăn chặn lỗi cascade, bảo vệ service khỏi quá tải, cho phép service phục hồi
2. **Retry**: Tăng khả năng thành công của request khi có lỗi tạm thời, giảm tác động của lỗi đến người dùng
3. **Rate Limiter**: Bảo vệ service khỏi quá tải, đảm bảo công bằng giữa các client, ngăn chặn tấn công DoS
4. **Time Limiter**: Ngăn chặn request chậm chiếm dụng tài nguyên quá lâu, cải thiện trải nghiệm người dùng

Việc kết hợp các mẫu thiết kế này giúp tăng khả năng phục hồi của hệ thống, cải thiện trải nghiệm người dùng và bảo vệ hệ thống khỏi các sự cố.
