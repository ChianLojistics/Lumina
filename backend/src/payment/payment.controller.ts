import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('payments')
@ApiBearerAuth('JWT-auth')
@Controller('api/payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new payment', description: 'Initiate a new payment transaction on the Stellar network.' })
  @ApiResponse({ status: 201, description: 'Payment created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid payment data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentService.create(createPaymentDto);
  }

  @Get()
  @ApiOperation({ summary: 'List payments', description: 'Retrieve all payments, optionally filtered by merchant address.' })
  @ApiQuery({ name: 'merchant_address', required: false, description: 'Filter payments by merchant Stellar address.' })
  @ApiResponse({ status: 200, description: 'List of payments.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findAll(@Query('merchant_address') merchantAddress?: string) {
    return this.paymentService.findAll(merchantAddress);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID', description: 'Retrieve details of a specific payment.' })
  @ApiResponse({ status: 200, description: 'Payment found.' })
  @ApiResponse({ status: 404, description: 'Payment not found.' })
  findOne(@Param('id') id: string) {
    return this.paymentService.findOne(id);
  }
}
