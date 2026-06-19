import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import puppeteer from "puppeteer";

const app = new Hono();

// 允许跨域 (虽然主要是服务端调服务端，但防备前端直接调)
app.use("/*", cors());

app.post("/api/generate-pdf", async (c) => {
    const { htmlContent, fileName = "document.pdf" } = await c.req.json();

    if (!htmlContent) {
        return c.json({ error: "Missing htmlContent" }, 400);
    }

    let browser;
    try {
        // 1. 启动浏览器 (生产环境必须加 --no-sandbox)
        browser = await puppeteer.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage", // 解决 Linux 下内存不足导致崩溃的问题
                "--font-render-hinting=none", // 优化字体渲染
            ],
        });

        const page = await browser.newPage();

        // 2. 设置视口大小 (影响 PDF 的默认排版)
        await page.setViewport({ width: 1920, height: 1080 });

        // 3. 注入 HTML 并等待渲染完成
        await page.setContent(htmlContent, {
            waitUntil: ["networkidle0", "domcontentloaded"],
        });

        // 4. 生成 PDF
        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true, // 必须！否则 CSS 背景色/图表不显示
            margin: { top: "1cm", right: "1cm", bottom: "1cm", left: "1cm" },
            displayHeaderFooter: false,
        });

        // 5. 返回文件流
        return new Response(pdfBuffer, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${fileName}"`,
            },
        });
    } catch (error) {
        console.error("PDF Generation Error:", error);
        return c.json(
            { error: "Failed to generate PDF", detail: error.message },
            500,
        );
    } finally {
        // 6. 致命避坑：无论成败，必须关闭浏览器释放内存！
        if (browser) await browser.close();
    }
});

// 健康检查接口
app.get("/health", (c) =>
    c.json({ status: "ok", time: new Date().toISOString() }),
);

const port = process.env.PORT || 3001;
console.log(`🚀 PDF Microservice is running on http://localhost:${port}`);

serve({ fetch: app.fetch, port });
