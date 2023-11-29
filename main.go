package main

import (
	"hash/crc64"
	"io"
	"log"
	"os"
	"time"
)

func main() {
	// don't count table generation time
	table := crc64.MakeTable(0x9A6C9329AC4BC9B5)

	start := time.Now()

	// read file "bigfile" and calculate its CRC64 checksum
	// using the polynomial represented by the Table.

	f, err := os.Open("bigfile")
	if err != nil {
		log.Fatal(err)
	}
	defer f.Close()

	hash := crc64.New(table)

	if _, err := io.Copy(hash, f); err != nil {
		log.Fatal(err)
	}

	sum := hash.Sum(nil)
	elapsed := time.Since(start)

	log.Printf("hex digest: %X", sum)
	log.Printf("time elapsed: %.2fms", elapsed.Seconds()*1000)
	log.Printf("GB/s: %.2f", float64(1)/elapsed.Seconds())
}
