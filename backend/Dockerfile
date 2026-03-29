FROM pdf2htmlex/pdf2htmlex:0.18.8.rc1-master-20200630-Ubuntu-focal-x86_64 AS pdf2htmlex_stage

RUN mkdir /pdf2htmlex-libs && \
    ldd /usr/local/bin/pdf2htmlEX | grep "=> /" | awk '{print $3}' | \
    grep -vE "/(libc|libm|libpthread|libdl|librt|libgcc_s|libstdc\+\+)\.so" | \
    xargs -I {} cp {} /pdf2htmlex-libs/

FROM python:3.11-slim

COPY --from=pdf2htmlex_stage /usr/local/bin/pdf2htmlEX /usr/local/bin/pdf2htmlEX
COPY --from=pdf2htmlex_stage /usr/local/share/pdf2htmlEX /usr/local/share/pdf2htmlEX
COPY --from=pdf2htmlex_stage /pdf2htmlex-libs/ /pdf2htmlex-libs/

ENV LD_LIBRARY_PATH=/pdf2htmlex-libs

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
