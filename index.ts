/**
 * CRC64: cyclic redundancy check, 64-bits
 *
 * In order to validate that artifacts are not being corrupted over the wire, this redundancy check allows us to
 * validate that there was no corruption during transmission. The implementation here is based on Go's hash/crc64 pkg,
 * but without the slicing-by-8 optimization: https://cs.opensource.google/go/go/+/master:src/hash/crc64/crc64.go
 *
 * This implementation uses a pregenerated table based on 0x9A6C9329AC4BC9B5 as the polynomial, the same polynomial that
 * is used for Azure Storage: https://github.com/Azure/azure-storage-net/blob/cbe605f9faa01bfc3003d75fc5a16b2eaccfe102/Lib/Common/Core/Util/Crc64.cs#L27
 */

import { readFileSync } from "fs";

// when transpile target is >= ES2020 (after dropping node 12) these can be changed to bigint literals - ts(2737)
const PREGEN_POLY_TABLE = [
  BigInt("0x0000000000000000"),
  BigInt("0x7F6EF0C830358979"),
  BigInt("0xFEDDE190606B12F2"),
  BigInt("0x81B31158505E9B8B"),
  BigInt("0xC962E5739841B68F"),
  BigInt("0xB60C15BBA8743FF6"),
  BigInt("0x37BF04E3F82AA47D"),
  BigInt("0x48D1F42BC81F2D04"),
  BigInt("0xA61CECB46814FE75"),
  BigInt("0xD9721C7C5821770C"),
  BigInt("0x58C10D24087FEC87"),
  BigInt("0x27AFFDEC384A65FE"),
  BigInt("0x6F7E09C7F05548FA"),
  BigInt("0x1010F90FC060C183"),
  BigInt("0x91A3E857903E5A08"),
  BigInt("0xEECD189FA00BD371"),
  BigInt("0x78E0FF3B88BE6F81"),
  BigInt("0x078E0FF3B88BE6F8"),
  BigInt("0x863D1EABE8D57D73"),
  BigInt("0xF953EE63D8E0F40A"),
  BigInt("0xB1821A4810FFD90E"),
  BigInt("0xCEECEA8020CA5077"),
  BigInt("0x4F5FFBD87094CBFC"),
  BigInt("0x30310B1040A14285"),
  BigInt("0xDEFC138FE0AA91F4"),
  BigInt("0xA192E347D09F188D"),
  BigInt("0x2021F21F80C18306"),
  BigInt("0x5F4F02D7B0F40A7F"),
  BigInt("0x179EF6FC78EB277B"),
  BigInt("0x68F0063448DEAE02"),
  BigInt("0xE943176C18803589"),
  BigInt("0x962DE7A428B5BCF0"),
  BigInt("0xF1C1FE77117CDF02"),
  BigInt("0x8EAF0EBF2149567B"),
  BigInt("0x0F1C1FE77117CDF0"),
  BigInt("0x7072EF2F41224489"),
  BigInt("0x38A31B04893D698D"),
  BigInt("0x47CDEBCCB908E0F4"),
  BigInt("0xC67EFA94E9567B7F"),
  BigInt("0xB9100A5CD963F206"),
  BigInt("0x57DD12C379682177"),
  BigInt("0x28B3E20B495DA80E"),
  BigInt("0xA900F35319033385"),
  BigInt("0xD66E039B2936BAFC"),
  BigInt("0x9EBFF7B0E12997F8"),
  BigInt("0xE1D10778D11C1E81"),
  BigInt("0x606216208142850A"),
  BigInt("0x1F0CE6E8B1770C73"),
  BigInt("0x8921014C99C2B083"),
  BigInt("0xF64FF184A9F739FA"),
  BigInt("0x77FCE0DCF9A9A271"),
  BigInt("0x08921014C99C2B08"),
  BigInt("0x4043E43F0183060C"),
  BigInt("0x3F2D14F731B68F75"),
  BigInt("0xBE9E05AF61E814FE"),
  BigInt("0xC1F0F56751DD9D87"),
  BigInt("0x2F3DEDF8F1D64EF6"),
  BigInt("0x50531D30C1E3C78F"),
  BigInt("0xD1E00C6891BD5C04"),
  BigInt("0xAE8EFCA0A188D57D"),
  BigInt("0xE65F088B6997F879"),
  BigInt("0x9931F84359A27100"),
  BigInt("0x1882E91B09FCEA8B"),
  BigInt("0x67EC19D339C963F2"),
  BigInt("0xD75ADABD7A6E2D6F"),
  BigInt("0xA8342A754A5BA416"),
  BigInt("0x29873B2D1A053F9D"),
  BigInt("0x56E9CBE52A30B6E4"),
  BigInt("0x1E383FCEE22F9BE0"),
  BigInt("0x6156CF06D21A1299"),
  BigInt("0xE0E5DE5E82448912"),
  BigInt("0x9F8B2E96B271006B"),
  BigInt("0x71463609127AD31A"),
  BigInt("0x0E28C6C1224F5A63"),
  BigInt("0x8F9BD7997211C1E8"),
  BigInt("0xF0F5275142244891"),
  BigInt("0xB824D37A8A3B6595"),
  BigInt("0xC74A23B2BA0EECEC"),
  BigInt("0x46F932EAEA507767"),
  BigInt("0x3997C222DA65FE1E"),
  BigInt("0xAFBA2586F2D042EE"),
  BigInt("0xD0D4D54EC2E5CB97"),
  BigInt("0x5167C41692BB501C"),
  BigInt("0x2E0934DEA28ED965"),
  BigInt("0x66D8C0F56A91F461"),
  BigInt("0x19B6303D5AA47D18"),
  BigInt("0x980521650AFAE693"),
  BigInt("0xE76BD1AD3ACF6FEA"),
  BigInt("0x09A6C9329AC4BC9B"),
  BigInt("0x76C839FAAAF135E2"),
  BigInt("0xF77B28A2FAAFAE69"),
  BigInt("0x8815D86ACA9A2710"),
  BigInt("0xC0C42C4102850A14"),
  BigInt("0xBFAADC8932B0836D"),
  BigInt("0x3E19CDD162EE18E6"),
  BigInt("0x41773D1952DB919F"),
  BigInt("0x269B24CA6B12F26D"),
  BigInt("0x59F5D4025B277B14"),
  BigInt("0xD846C55A0B79E09F"),
  BigInt("0xA72835923B4C69E6"),
  BigInt("0xEFF9C1B9F35344E2"),
  BigInt("0x90973171C366CD9B"),
  BigInt("0x1124202993385610"),
  BigInt("0x6E4AD0E1A30DDF69"),
  BigInt("0x8087C87E03060C18"),
  BigInt("0xFFE938B633338561"),
  BigInt("0x7E5A29EE636D1EEA"),
  BigInt("0x0134D92653589793"),
  BigInt("0x49E52D0D9B47BA97"),
  BigInt("0x368BDDC5AB7233EE"),
  BigInt("0xB738CC9DFB2CA865"),
  BigInt("0xC8563C55CB19211C"),
  BigInt("0x5E7BDBF1E3AC9DEC"),
  BigInt("0x21152B39D3991495"),
  BigInt("0xA0A63A6183C78F1E"),
  BigInt("0xDFC8CAA9B3F20667"),
  BigInt("0x97193E827BED2B63"),
  BigInt("0xE877CE4A4BD8A21A"),
  BigInt("0x69C4DF121B863991"),
  BigInt("0x16AA2FDA2BB3B0E8"),
  BigInt("0xF86737458BB86399"),
  BigInt("0x8709C78DBB8DEAE0"),
  BigInt("0x06BAD6D5EBD3716B"),
  BigInt("0x79D4261DDBE6F812"),
  BigInt("0x3105D23613F9D516"),
  BigInt("0x4E6B22FE23CC5C6F"),
  BigInt("0xCFD833A67392C7E4"),
  BigInt("0xB0B6C36E43A74E9D"),
  BigInt("0x9A6C9329AC4BC9B5"),
  BigInt("0xE50263E19C7E40CC"),
  BigInt("0x64B172B9CC20DB47"),
  BigInt("0x1BDF8271FC15523E"),
  BigInt("0x530E765A340A7F3A"),
  BigInt("0x2C608692043FF643"),
  BigInt("0xADD397CA54616DC8"),
  BigInt("0xD2BD67026454E4B1"),
  BigInt("0x3C707F9DC45F37C0"),
  BigInt("0x431E8F55F46ABEB9"),
  BigInt("0xC2AD9E0DA4342532"),
  BigInt("0xBDC36EC59401AC4B"),
  BigInt("0xF5129AEE5C1E814F"),
  BigInt("0x8A7C6A266C2B0836"),
  BigInt("0x0BCF7B7E3C7593BD"),
  BigInt("0x74A18BB60C401AC4"),
  BigInt("0xE28C6C1224F5A634"),
  BigInt("0x9DE29CDA14C02F4D"),
  BigInt("0x1C518D82449EB4C6"),
  BigInt("0x633F7D4A74AB3DBF"),
  BigInt("0x2BEE8961BCB410BB"),
  BigInt("0x548079A98C8199C2"),
  BigInt("0xD53368F1DCDF0249"),
  BigInt("0xAA5D9839ECEA8B30"),
  BigInt("0x449080A64CE15841"),
  BigInt("0x3BFE706E7CD4D138"),
  BigInt("0xBA4D61362C8A4AB3"),
  BigInt("0xC52391FE1CBFC3CA"),
  BigInt("0x8DF265D5D4A0EECE"),
  BigInt("0xF29C951DE49567B7"),
  BigInt("0x732F8445B4CBFC3C"),
  BigInt("0x0C41748D84FE7545"),
  BigInt("0x6BAD6D5EBD3716B7"),
  BigInt("0x14C39D968D029FCE"),
  BigInt("0x95708CCEDD5C0445"),
  BigInt("0xEA1E7C06ED698D3C"),
  BigInt("0xA2CF882D2576A038"),
  BigInt("0xDDA178E515432941"),
  BigInt("0x5C1269BD451DB2CA"),
  BigInt("0x237C997575283BB3"),
  BigInt("0xCDB181EAD523E8C2"),
  BigInt("0xB2DF7122E51661BB"),
  BigInt("0x336C607AB548FA30"),
  BigInt("0x4C0290B2857D7349"),
  BigInt("0x04D364994D625E4D"),
  BigInt("0x7BBD94517D57D734"),
  BigInt("0xFA0E85092D094CBF"),
  BigInt("0x856075C11D3CC5C6"),
  BigInt("0x134D926535897936"),
  BigInt("0x6C2362AD05BCF04F"),
  BigInt("0xED9073F555E26BC4"),
  BigInt("0x92FE833D65D7E2BD"),
  BigInt("0xDA2F7716ADC8CFB9"),
  BigInt("0xA54187DE9DFD46C0"),
  BigInt("0x24F29686CDA3DD4B"),
  BigInt("0x5B9C664EFD965432"),
  BigInt("0xB5517ED15D9D8743"),
  BigInt("0xCA3F8E196DA80E3A"),
  BigInt("0x4B8C9F413DF695B1"),
  BigInt("0x34E26F890DC31CC8"),
  BigInt("0x7C339BA2C5DC31CC"),
  BigInt("0x035D6B6AF5E9B8B5"),
  BigInt("0x82EE7A32A5B7233E"),
  BigInt("0xFD808AFA9582AA47"),
  BigInt("0x4D364994D625E4DA"),
  BigInt("0x3258B95CE6106DA3"),
  BigInt("0xB3EBA804B64EF628"),
  BigInt("0xCC8558CC867B7F51"),
  BigInt("0x8454ACE74E645255"),
  BigInt("0xFB3A5C2F7E51DB2C"),
  BigInt("0x7A894D772E0F40A7"),
  BigInt("0x05E7BDBF1E3AC9DE"),
  BigInt("0xEB2AA520BE311AAF"),
  BigInt("0x944455E88E0493D6"),
  BigInt("0x15F744B0DE5A085D"),
  BigInt("0x6A99B478EE6F8124"),
  BigInt("0x224840532670AC20"),
  BigInt("0x5D26B09B16452559"),
  BigInt("0xDC95A1C3461BBED2"),
  BigInt("0xA3FB510B762E37AB"),
  BigInt("0x35D6B6AF5E9B8B5B"),
  BigInt("0x4AB846676EAE0222"),
  BigInt("0xCB0B573F3EF099A9"),
  BigInt("0xB465A7F70EC510D0"),
  BigInt("0xFCB453DCC6DA3DD4"),
  BigInt("0x83DAA314F6EFB4AD"),
  BigInt("0x0269B24CA6B12F26"),
  BigInt("0x7D0742849684A65F"),
  BigInt("0x93CA5A1B368F752E"),
  BigInt("0xECA4AAD306BAFC57"),
  BigInt("0x6D17BB8B56E467DC"),
  BigInt("0x12794B4366D1EEA5"),
  BigInt("0x5AA8BF68AECEC3A1"),
  BigInt("0x25C64FA09EFB4AD8"),
  BigInt("0xA4755EF8CEA5D153"),
  BigInt("0xDB1BAE30FE90582A"),
  BigInt("0xBCF7B7E3C7593BD8"),
  BigInt("0xC399472BF76CB2A1"),
  BigInt("0x422A5673A732292A"),
  BigInt("0x3D44A6BB9707A053"),
  BigInt("0x759552905F188D57"),
  BigInt("0x0AFBA2586F2D042E"),
  BigInt("0x8B48B3003F739FA5"),
  BigInt("0xF42643C80F4616DC"),
  BigInt("0x1AEB5B57AF4DC5AD"),
  BigInt("0x6585AB9F9F784CD4"),
  BigInt("0xE436BAC7CF26D75F"),
  BigInt("0x9B584A0FFF135E26"),
  BigInt("0xD389BE24370C7322"),
  BigInt("0xACE74EEC0739FA5B"),
  BigInt("0x2D545FB4576761D0"),
  BigInt("0x523AAF7C6752E8A9"),
  BigInt("0xC41748D84FE75459"),
  BigInt("0xBB79B8107FD2DD20"),
  BigInt("0x3ACAA9482F8C46AB"),
  BigInt("0x45A459801FB9CFD2"),
  BigInt("0x0D75ADABD7A6E2D6"),
  BigInt("0x721B5D63E7936BAF"),
  BigInt("0xF3A84C3BB7CDF024"),
  BigInt("0x8CC6BCF387F8795D"),
  BigInt("0x620BA46C27F3AA2C"),
  BigInt("0x1D6554A417C62355"),
  BigInt("0x9CD645FC4798B8DE"),
  BigInt("0xE3B8B53477AD31A7"),
  BigInt("0xAB69411FBFB21CA3"),
  BigInt("0xD407B1D78F8795DA"),
  BigInt("0x55B4A08FDFD90E51"),
  BigInt("0x2ADA5047EFEC8728"),
];

export type CRC64DigestEncoding = "hex" | "base64" | "buffer";

class CRC64 {
  private _crc: bigint;

  constructor() {
    this._crc = BigInt(0);
  }

  update(data: Buffer | string): void {
    const buffer = typeof data === "string" ? Buffer.from(data) : data;
    let crc = CRC64.flip64Bits(this._crc);

    for (const dataByte of buffer) {
      const crcByte = Number(crc & BigInt(0xff));
      crc = PREGEN_POLY_TABLE[crcByte ^ dataByte] ^ (crc >> BigInt(8));
    }

    this._crc = CRC64.flip64Bits(crc);
  }

  digest(encoding?: CRC64DigestEncoding): string | Buffer {
    switch (encoding) {
      case "hex":
        return this._crc.toString(16).toUpperCase();
      case "base64":
        return this.toBuffer().toString("base64");
      default:
        return this.toBuffer();
    }
  }

  private toBuffer(): Buffer {
    return Buffer.from(
      [0, 8, 16, 24, 32, 40, 48, 56].map((s) =>
        Number((this._crc >> BigInt(s)) & BigInt(0xff)),
      ),
    );
  }

  static flip64Bits(n: bigint): bigint {
    return (BigInt(1) << BigInt(64)) - BigInt(1) - n;
  }
}

// export default CRC64;

// compute the CRC64 of "bigfile" using a read stream

import { createReadStream } from "fs";
async function main() {
  {
    let start = performance.now();

    let s = createReadStream("bigfile");
    let crc = new CRC64();
    s.on("data", (d) => crc.update(d));
    await new Promise((resolve) => s.on("close", resolve));
    let hash = crc.digest("hex");

    let end = performance.now();
    console.log(`hex digest (crc64): ${hash}`);
    console.log(`computed in ${(end - start).toFixed(2)}ms`);
    console.log(
      `GB/s: ${(
        s.bytesRead /
        1024 /
        1024 /
        1024 /
        ((end - start) / 1000)
      ).toFixed(8)}`,
    );
  }
}

main().catch(console.error);
