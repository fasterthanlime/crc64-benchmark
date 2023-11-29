use std::{fs::File, io::BufRead};

const CRC64_AZURE: crc::Algorithm<u64> = crc::Algorithm {
    width: 64,
    poly: 0x9A6C9329AC4BC9B5,
    init: 0x0,
    refin: false,
    refout: false,
    xorout: 0x0,
    check: 0x0,
    residue: 0x0,
};

fn main() {
    let crc = crc::Crc::<u64>::new(&CRC64_AZURE);
    let mut digest = crc.digest();

    // measure elapsed time
    let start = std::time::Instant::now();
    let f = File::open("bigfile").unwrap();

    // read 1MB at a time, and update the digest
    let mut reader = std::io::BufReader::with_capacity(1024 * 1024, f);
    loop {
        let length = {
            let buffer = reader.fill_buf().unwrap();
            digest.update(buffer);
            buffer.len()
        };
        if length == 0 {
            break;
        }
        reader.consume(length);
    }

    // print the digest as hex and the elapsed time
    println!("{:x}", digest.finalize());
    println!("time elapsed: {:?}", start.elapsed());
}
