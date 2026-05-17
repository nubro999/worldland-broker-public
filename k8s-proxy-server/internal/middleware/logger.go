// logger.go — structured request-logging middleware.
//
// Logs method, path, status and latency per request. Placed early in
// the chain so it measures total handler time; intentionally cheap so
// it stays negligible under 200-instance request load.

package middleware

import (
	"log"
	"time"

	"github.com/gin-gonic/gin"
)

// Logger는 요청을 로깅하는 미들웨어입니다.
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 시작 시간 기록
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method

		// 다음 핸들러 실행
		c.Next()

		// 요청 처리 후 로깅
		latency := time.Since(start)
		statusCode := c.Writer.Status()
		clientIP := c.ClientIP()

		log.Printf("[%s] %s %s | %d | %v | %s",
			method,
			path,
			clientIP,
			statusCode,
			latency,
			c.Errors.ByType(gin.ErrorTypePrivate).String(),
		)
	}
}
