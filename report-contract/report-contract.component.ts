import * as xlsx from 'xlsx'

import { Component, ElementRef, inject, OnDestroy, OnInit, ViewChild, signal, ChangeDetectorRef, viewChild, TemplateRef, ViewEncapsulation } from '@angular/core'
import { ContractType } from '../../../contract/shared/contract.model'
import { Customer, vwUserInfo } from '@venio/shared/models/venio.model'
import { ReportFilter, Summary_Column, Summary_Contract } from '../../shared/report.model'
import { AppComponent } from '../../../../app.component'
import { ColumnModel } from '@venio/shared/models/datatable.model'
import { ContractService } from '../../../contract/shared/contract.service'
import { CustomerService } from '../../../customer/shared/customer.service'
import { DataSharingService } from '@venio/core/data-sharing.service'
import { DateFormat } from '@gofive/angular-common'
import { DatePipe } from '@angular/common'
import { DependenciesInjector } from '@venio/core/dependencies-injector'
import { FieldSettingsModel, FilteringEventArgs } from '@syncfusion/ej2-dropdowns'
import { FilterSharingService } from '@venio/core/filter-sharing.service'
import { FilterContract, FrequencyType } from '@venio/shared/enum/contract.enum'
import { MyDropdownComponent } from '../../../shared/my-dropdown/my-dropdown.component'
import { OpportunityManagementService } from '../../../opportunitymanagement/shared/opportunitymanagement.service'
import { Permissions } from '@venio/shared/enum/permissions.enum'
import { ReportService } from '../../shared/report.service'
import { Router } from '@angular/router'
import { StaffFilter } from '../../../admin/shared/team.model'
import { Statuses } from '@venio/shared/enum/statuses.enum'
import { debounceTime, firstValueFrom, Subject, Subscription, switchMap, takeUntil } from 'rxjs'
import { TeamService } from '../../../admin/shared/team.service'
import { getDate } from '@venio/shared/helper/dateTime'
import { AppConfig } from '@venio/shared/classes/config'
import { CustomerDialogService } from '@venio/modules/customer/shared/services/customer-dialog.service'
import { ReportPDFService } from '@venio/shared/services/report-pdf.service'
import { DropdownEventArgs, FilterDataSource } from '@gofive/design-system-dropdown'
import { ExportFileType } from '@venio/shared/enum/export-file-type.enum'
import { HistoryLogComponent } from '../../shared/history-log/history-log.component'
import { DateRangeModel } from '@gofive/design-system-calendar/lib/models/datepicker.model'
import { Go5DropdownFilterEventArgs } from '@venio/shared/interfaces/dropdown.interface'
import { STATUS_NAME } from '@gofive/design-system-badge'
import { Go5FieldType, Go5TableStandardColumn, Go5TableStandardColumnType, IGo5TableStandardSortEvent } from '@gofive/design-system-table'
import { LanguageService } from '@venio/shared/services/language.service'

@Component({
	selector: 'app-report-contract',
	templateUrl: './report-contract.component.html',
	styleUrls: ['./report-contract.component.scss'],
	encapsulation: ViewEncapsulation.None,
})
export class ReportContractComponent implements OnInit, OnDestroy {
	private readonly reportPDFService = inject(ReportPDFService)

	public currentUser: vwUserInfo = new vwUserInfo()
	public canExportReport: boolean = false
	@ViewChild('staff')
	public staffDdl: MyDropdownComponent
	@ViewChild('dialog')
	dialog: HistoryLogComponent
	public counter = Array
	public filter: ReportFilter = new ReportFilter()
	public data: Object[] = []
	public staffs: Object[] = []
	public stfFields: Object = { text: 'fullName', value: 'userId', picture: 'pictureUrl', detail: 'positionName' }
	public teams: Object[] = []
	public teamFields: Object = { text: 'teamName', value: 'teamId' }
	public customers: Customer[] = []
	public category: ContractType[] = []
	public customerFields: Object = {
		text: 'customerName',
		value: 'customerId',
		picture: 'pictureUrl',
		status: 'customerStateDisplay'
	}
	public categoryFields: Object = { text: 'contractTypeName', value: 'contractTypeId' }
	public products = []
	public productFields: Object = { text: 'partName', value: 'partId' }
	public statuses: { [key: string]: Object }[] = [
		{ text: 'common_filter_active', value: FilterContract.Active },
		{ text: 'common_filter_expiring', value: FilterContract.Expiring },
		{ text: 'common_filter_renewed', value: FilterContract.Renewed },
		{ text: 'common_filter_upcoming', value: FilterContract.Upcoming },
		{ text: 'common_filter_completed', value: FilterContract.Completed },
		{ text: 'common_filter_cancelled', value: FilterContract.Cancelled }
	]
	@ViewChild('SOTable')
	public SOTable: ElementRef
	public columnsFields: FieldSettingsModel = { text: 'columnName', value: 'columnId' }
	public columnsDdlValue: number[] = []
	private readonly customBody = viewChild<TemplateRef<HTMLTableCellElement>>('customerCell')
	private readonly employeeTemp = viewChild<TemplateRef<HTMLTableCellElement>>('employeeCell')
	private readonly frequencyTemp = viewChild<TemplateRef<HTMLTableCellElement>>('frequencyCell')
	public columns: Go5TableStandardColumn[] = []
	ngAfterViewInit(): void {
		this.columns = [
			{
				id: 'contractName',
				header: {
					text: 'common_subject',
				},
				width: '180px',
				minWidth: '180px',
				maxWidth: '180px',
				sortable: true,
				isActive: true,
				type: Go5TableStandardColumnType.Text,
				topic: {
						fieldName: 'contractName',
				}
			},
			{
				id: 'customerName',
				header: {
					text: 'common_report_customer_name',
				},
				width: '190px',
				minWidth: '190px',
				maxWidth: '190px',
				sortable: true,
				isActive: true,
				type: Go5TableStandardColumnType.Custom,
				bodyTemplate: this.customBody()
			},
			{
				id: 'contractTypeName',
				header: {
					text: 'common_report_category',
				},
				width: '180px',
				minWidth: '180px',
				maxWidth: '180px',
				sortable: true,
				isActive: true,
				type: Go5TableStandardColumnType.Text,
				topic: {
						fieldName: 'contractTypeName',
				}
			},
			{
				id: 'fullname',
				header: {
					text: 'common_report_staff',
				},
				width: '180px',
				minWidth: '180px',
				maxWidth: '180px',
				sortable: true,
				isActive: true,
				type: Go5TableStandardColumnType.Custom,
				bodyTemplate: this.employeeTemp(),
			},
			{
				id: 'dateCreated',
				header: {
					text: 'report_contract_date',
				},
				width: '180px',
				minWidth: '180px',
				maxWidth: '180px',
				sortable: true,
				isActive: true,
				type: Go5TableStandardColumnType.Text,
				topic: {
						fieldName: 'dateCreated',
						fieldType: Go5FieldType.Date,
						dateFormat: DateFormat.dateTimeShort
				}
			},
			{
				
				id: 'frequency',
				header:{
					text: 'common_contract_service_agreement',
				},
				sortable: true,
				type: Go5TableStandardColumnType.Custom,
				isActive: true,
				width: '200px',
				minWidth: '200px',
				maxWidth: '200px',
				// topic:{
				// 	fieldName: 'frequency',
				// }
				bodyTemplate: this.frequencyTemp()
			},
			{
				id: 'contractValue',
				header: {
					text: 'common_contract_value',
				},
				sortable: true,
				type: Go5TableStandardColumnType.Money,
				isActive: true,
				width: '220px',
				minWidth: '220px',
				maxWidth: '220px',
				money: {
					fieldName: 'contractValue',
				}
			},
			{
				id: 'statusId',
				header: { 
					text: 'common_report_tb_statusname'
				},
				sortable: true,
				isActive: true,
				width: '180px',
				minWidth: '180px',
				maxWidth: '180px',
				type:Go5TableStandardColumnType.Status,
				status: {
					fieldName: 'statusId',
					type: STATUS_NAME.Contract
				},
			}
		]
	}
		

	public summary: Summary_Contract = null
	public summaryColumm: Summary_Column[] = [
		{ column: 'totalContract', unit: 'report_contract_total', type: 'number', line: false },
		{ column: 'totalUpcoming', unit: 'common_filter_upcoming', type: 'number', line: true },
		{ column: 'totalActive', unit: 'common_status_contractactive', type: 'number', line: false },
		{ column: 'totalCancelled', unit: 'common_status_contractcancelled', type: 'number', line: false },
		{ column: 'topContractType', unit: 'report_contract_top_category', type: 'topSummary', line: true },
		{
			column: 'topCustomer',
			unit: 'report_contract_top_customer',
			type: 'topSummary',
			line: false,
			value: 'customerId'
		},
		{ column: 'avgContractDuration', unit: 'report_contract_avg_duration', type: 'readingTime', line: true },
		{ column: 'contractRenewPercentage', unit: 'report_contract_avg_renewed', type: 'percentage', line: false },
		{ column: 'totalValue', unit: 'report_contract_total_value', type: 'total', line: true, total: true }
	]
	public btnExport = false
	public filterExport: ReportFilter = new ReportFilter()
	private teamsSubscribe$: Subscription
	private staffSubscribe$: Subscription
	private dataSubscription$: Subscription
	private currentFilterSubscription$: Subscription
	private currentDateFilterSubscription$: Subscription
	private summaryObserver$: Subscription
	private scrollHeight = 0

	private destroy$ = new Subject<void>()
	private searchCustomer$ = new Subject<FilteringEventArgs>()
	private debounceTimeMs = 300
	public typeExportFile: ExportFileType = ExportFileType.Contract

	public isLoading = signal(false)
	public isSummaryLoading = signal(false)
	public isInitialLoading = true
	private contentScrollElement: HTMLElement
	public date: Date = new Date()
	public dateRang: DateRangeModel = {
		dateFrom: new Date(this.date.getFullYear(), this.date.getMonth(), 1),
		dateTo: new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0)
	}
	public dataSourceFilter: FilterDataSource[] = [
		{
			text: 'common_status',
			value: 'statusIds',
			allowFiltering: false,
			dataSource: this.statuses
		},

		{
			text: 'common_report_category',
			value: 'type',
			allowFiltering: true,
			fields: this.categoryFields,
			dataSource: []
		},
		{
			text: 'common_customer',
			value: 'customerIds',
			fields: this.customerFields,
			allowFiltering: true,
			dataSource: []
		},
		{
			text: 'common_team',
			value: 'teamIds',
			fields: this.teamFields,
			allowFiltering: true,
			dataSource: []
		},
		{
			text: 'common_staff',
			value: 'userIds',
			fields: this.stfFields,
			allowFiltering: true,
			dataSource: []
		}
	]

	constructor(
		public app: AppComponent,
		public dataShare: DataSharingService,
		private filterSharingService: FilterSharingService,
		private teamService: TeamService,
		private customerService: CustomerService,
		private customerDialogService: CustomerDialogService,
		private contractService: ContractService,
		private OMService: OpportunityManagementService,
		public reportService: ReportService,
		public languageService: LanguageService,
		public router: Router,
		private datePipe: DatePipe,
		public _cdr: ChangeDetectorRef
	) {
		this.currentUser = DependenciesInjector.getCurrentUser()
		if (this.currentUser) {
			if (this.currentUser.permissions.indexOf(Permissions.Reports_Export) > 1) {
				this.canExportReport = true
			}
		}
		this.currentFilterSubscription$ = this.filterSharingService.filterTravelReport.subscribe((res) => {
			this.filter = res
			this.scrollHeight = 0
			this.data = []
			this.reloadData()
		})
		this.currentDateFilterSubscription$ = this.dataShare.currentSearchReportFilter.subscribe((s) => {
			this.filter.dateFrom = getDate(s.dateFrom)
			this.filter.dateTo = getDate(s.dateTo)
			this.filterSharingService.setFilterTravelReport(this.filter)
		})
	}

	get DateFormat() {
		return DateFormat
	}

	get FrequencyType() {
		return FrequencyType
	}

	get Statuses() {
		return Statuses
	}

	get STATUS_NAME() {
		return STATUS_NAME
	}

	counters(value) {
		return new Array(value)
	}

	async ngOnInit(): Promise<void> {
		this.getTeamsList()
		this.getStaffList()
		this.getCategoryList()
		this.getProductList()
		this.loadSetting()

		this.searchCustomer$
			.pipe(
				takeUntil(this.destroy$),
				debounceTime(this.debounceTimeMs),
				switchMap((event) => this.processInput(event))
			)
			.subscribe(({ event, res }) => {
				event?.updateData(res as any)
			})

		this.customers = await this.getCustomersList()

		this.contentScrollElement = document.querySelector('.dashboard-report-page .content')
		if (this.contentScrollElement) {
			this.onScroll = this.onScroll.bind(this)
			this.contentScrollElement.addEventListener('scroll', this.onScroll)
		}
	}

	private processInput(event: FilteringEventArgs): Promise<{
		res: Customer[]
		event: FilteringEventArgs
	}> {
		return new Promise(async (resolve) => {
			const res = await this.getCustomersList(event?.text ?? '')
			resolve({ res, event })
		})
	}

	public loadSetting() {
		this.currentDateFilterSubscription$ = this.dataShare.currentSearchReportFilter.subscribe({
			next: (s) => {
				this.filter.dateFrom = getDate(s.dateFrom)
				this.filter.dateTo = getDate(s.dateTo)
				this.reloadData()
			},
			error: () => {
				const maxDate = new Date()
				const dateRang = { start: new Date(maxDate.getFullYear(), maxDate.getMonth(), 1), end: maxDate }
				this.filter.dateFrom = dateRang?.start
				this.filter.dateTo = dateRang?.end
				this.dataShare.setSearchReportFilter(this.filter)
			}
		})
	}

	public reloadData() {
		setTimeout(() => {
			this.scrollHeight = 0
			this.data = []
			this.getData()
			this.getDataSummary()
			this.isInitialLoading = false
		}, 50)
	}

	ngOnDestroy() {
		this.teamsSubscribe$?.unsubscribe()
		this.staffSubscribe$?.unsubscribe()
		this.dataSubscription$?.unsubscribe()
		this.currentFilterSubscription$?.unsubscribe()
		this.currentDateFilterSubscription$?.unsubscribe()
		this.customerDialogService.closeCustomerDetailDialog()

		this.destroy$.next()
		this.destroy$.complete()

		if (this.contentScrollElement) {
			this.contentScrollElement.removeEventListener('scroll', this.onScroll)
		}
	}

	getData() {
		if (this.isLoading()) return
		this.isLoading.set(true)
		this.filter.start = this.data?.length || 0
		this.dataSubscription$?.unsubscribe()
		this.dataSubscription$ = this.reportService.ContractReport(this.filter).subscribe({
			next: (res) => {
				this.data = this.data.concat(res.data)
				this.isLoading.set(false)
				this.dataSubscription$?.unsubscribe()
				this.dataSubscription$?.remove(this.dataSubscription$)
				this.dataSubscription$ = null
				this._cdr.detectChanges()

				AppConfig.OPEN_FN.next({ key: 'dialog', value: { httpStatusCode: res?.httpStatusCode } })
			},
			error: () => {
				this.data = []
				this.isLoading.set(false)
			}
		})
	}

	public onSelectedFilter(event: DropdownEventArgs) {
		const type: string = event?.data?.value

		if (type === 'teamIds') {
			this.filter.userIds = []

			this.getStaffList(this.filter.teamIds?.length ? this.filter.teamIds : null)
		}

		this.filterSharingService.setFilterTravelReport(this.filter)
	}

	public onSearch(key: string, value: any[]) {
		this.filter[key] = value?.length > 0 ? value : null
		this.filterSharingService.setFilterTravelReport(this.filter)
	}

	public openEmp(userId: string) {
		this.router.navigateByUrl('/employee/' + userId)
	}

	public openCustomer(id: number) {
		this.app.openCustomerURL(id)
	}

	public onScroll(e) {
		const element: HTMLElement = e.target

		if (
			!this.isLoading() &&
			this.scrollHeight < element?.scrollHeight &&
			element?.offsetHeight + element?.scrollTop + 50 > element?.scrollHeight
		) {
			this.scrollHeight = element?.scrollHeight
			this.getData()
		}
	}

	public sortingBy(event: IGo5TableStandardSortEvent){
        this.columns?.forEach((column) => {
            if(column.id === event.id){
                column['sortType'] = event.sortOrder || 'asc'
            }else{
                column['sortType'] = null
            }
        })
 
        this.filter.orderBy = `${event.id} ${event.sortOrder?.toLowerCase() || 'asc'}`
        this.reloadData()
    }

	// public onSelectedColumn(value: number[]) {
	// 	this.columns.forEach((s) => (s.isActive = value.findIndex((a) => a === s.id) > -1))
	// }

	public onSelectedTeams(e) {
		this.filter.teamIds = e?.length > 0 ? e : null
		this.getStaffList(this.filter.teamIds)
		this.filter.userIds = null
		this.staffDdl.myDdl.value = null
		this.reloadData()
	}

	public async exportData() {
		this.btnExport = true
		let objectExport = null
		let sampleColumns = []
		this.columns.forEach((column) => {
			if(column.isActive){
				sampleColumns.push({
					column: column.id,
					columnName: column.header.text,
					isActive: column.isActive
				})
			}
		})
		this.reportPDFService.exportReport(sampleColumns).then((val) => {
			console.log('columns = ', val)
			objectExport = val
			console.log('objectExport = ', objectExport)
			this.filterExport = JSON.parse(JSON.stringify(this.filter))
			this.filterExport.start = 0
			this.filterExport.pageLength = 10000
			this.filterExport.orderColumns = objectExport.orderColumns
			this.reportService.ExportReportContract(this.filterExport).subscribe({
				next: (res) => {
					this.reportService.downloadFile(res.body, res.headers)
					this.btnExport = false
				},
				error: (error) => {
					AppConfig.OPEN_FN.next({ key: 'dialog', value: { httpStatusCode: error?.status } })
				}
			})
		})
	}

	public exportToExcel() {
		const wb: xlsx.WorkBook = xlsx.utils.book_new()
		const ws: xlsx.WorkSheet = xlsx.utils.table_to_sheet(this.SOTable?.nativeElement, { cellStyles: true })
		xlsx.utils.book_append_sheet(wb, ws, 'Sheet1')
		const date = 'yyyy-MM-d'
		const nameFile =
			'Quotation_Report' +
			this.datePipe.transform(this.filter.dateFrom, date) +
			'_to_' +
			this.datePipe.transform(this.filter.dateTo, date) +
			'.xlsx'
		xlsx.writeFile(wb, nameFile)
	}

	getRowSpan(data: any[]) {
		const detail = this.columns.find((s) => s['columnId'] === 4)
		if (detail.isActive) {
			return data?.length || 1
		}
		return 1
	}

	getActiveColumn(columnId: number) {
		return this.columns.find((s) => s['columnId'] === columnId).isActive
	}

	get CurrentAppLanguage() {
        return this.languageService.GetCurrenAppLanguage()
    }

	private getDataSummary() {
		if (this.isSummaryLoading()) return
		console.log('Filter = ', this.filter)
		this.isSummaryLoading.set(true)
		this.summary = new Summary_Contract()
		this.summaryObserver$?.unsubscribe()
		this.summaryObserver$ = this.reportService.SummaryContractReport(this.filter).subscribe({
			next: (res) => {
				this.summary = res.data
				this.isSummaryLoading.set(false)
				this.summaryObserver$?.unsubscribe()
				this.summaryObserver$?.remove(this.summaryObserver$)
				this.summaryObserver$ = null
			},
			error: (error) => {
				console.error(error)
				this.isSummaryLoading.set(false)
				AppConfig.OPEN_FN.next({ key: 'dialog', value: { httpStatusCode: error?.status } })
			}
		})
	}

	private getTeamsList() {
		this.teamsSubscribe$ = this.teamService.GetDdlTeam(Permissions.contract).subscribe({
			next: (res) => {
				this.teams = res
				this.setDataSourceFilter('teamIds', res)
				console.log('ngOnInit', res)
				AppConfig.OPEN_FN.next({ key: 'dialog', value: { httpStatusCode: res?.httpStatusCode } })
			},
			error: () => {
				this.teams = []
				this.setDataSourceFilter('teamIds', [])
			}
		})
	}

	private getStaffList(teamIds: number[] = null) {
		this.staffSubscribe$?.unsubscribe()
		const model: StaffFilter = new StaffFilter()
		model.teamIds = teamIds
		model.take = 100
		model.skip = 0
		model.type = Permissions.contract
		model.companyIds = this.filter.companyIds || []
		this.staffs = []
		this.staffSubscribe$ = this.teamService.GetFilterStaff(model).subscribe(
			(res) => {
				this.staffs = res.data
				this.setDataSourceFilter('userIds', res.data)
				this.staffSubscribe$?.unsubscribe()
				this.staffSubscribe$?.remove(this.staffSubscribe$)
				this.staffSubscribe$ = null
			},
			(err) => {
				console.log(err)
				this.setDataSourceFilter('userIds', [])
				AppConfig.OPEN_FN.next({ key: 'dialog', value: { httpStatusCode: err?.status } })
			}
		)
	}

	async getCustomersList(text = ''): Promise<Customer[]> {
		try {
			const res = await this.customerService.GetSearchCustomer({
				search: text,
				take: 1000
			})
			this.setDataSourceFilter('customerIds', res)
			return res
		} catch (error: unknown) {
			console.error(error)
			this.customers = []
			this.setDataSourceFilter('customerIds', [])
			if (typeof error === 'object' && 'status' in error && typeof error?.status === 'number') {
				AppConfig.OPEN_FN.next({ key: 'dialog', value: { httpStatusCode: error?.status } })
			}
		}
	}

	private async getCategoryList(): Promise<void> {
		try {
			const res = await firstValueFrom(this.contractService.GetCategory())
			this.category = res.data
			this.setDataSourceFilter('type', res.data)
		} catch (error: unknown) {
			console.error(error)
			this.category = []
			this.setDataSourceFilter('type', [])
			if (typeof error === 'object' && 'status' in error && typeof error?.status === 'number') {
				AppConfig.OPEN_FN.next({ key: 'dialog', value: { httpStatusCode: error?.status } })
			}
		}
	}

	private async getProductList(): Promise<void> {
		try {
			const res = await firstValueFrom(this.OMService.GetProduct())
			this.products = res.data
		} catch (error: unknown) {
			console.error(error)
			this.products = []
			if (typeof error === 'object' && 'status' in error && typeof error?.status === 'number') {
				AppConfig.OPEN_FN.next({ key: 'dialog', value: { httpStatusCode: error?.status } })
			}
		}
	}

	openCustomerDetailDialog(event: MouseEvent, customerId: number) {
		event.stopPropagation()
		this.customerDialogService.openCustomerDetailDialog({ customerId })
	}

	async onCustomerFiltering($event?: FilteringEventArgs): Promise<void> {
		this.searchCustomer$.next($event)
	}

	private setDataSourceFilter(key: string, data: any[]) {
		const filter = this.dataSourceFilter.find((f) => f.value === key)
		if (filter) {
			filter.dataSource = data
		}
		this.dataSourceFilter = [...this.dataSourceFilter]
		this._cdr.detectChanges()
	}

	public openHistoryLog() {
		this.dialog?.openDialog(this.typeExportFile)
	}

	public onClearAll(event) {
		this.dataSourceFilter.forEach((filter) => {
			const key = filter.value
			this.filter[key] = []
		})

		this.getDataSummary()
		this.getData()
	}

	public setFilter(date: ReportFilter) {
		this.filter.dateFrom = new Date(date.dateFrom)
		this.filter.dateTo = new Date(date.dateTo)
		this.filter.interval = date.interval
		this.filterSharingService.setFilterTravelReport(this.filter)
	}

	onFiltering($event: Go5DropdownFilterEventArgs): void {
		const filterType = $event?.value
		const searchText = $event?.text ?? ''
		if (filterType === 'customerIds') {
			this.customerService
				.GetSearchCustomer({
					search: searchText
				})
				.then((res) => {
					this.customers = res

					if ($event.updateData) {
						$event.updateData(res)
					}
				})
				.catch((error) => {
					console.log(error)
					this.customers = []

					if ($event.updateData) {
						$event.updateData([])
					}
				})
		}

		if (filterType === 'userIds') {
			this.teamService
				.GetFilterStaff({
					search: searchText,
					teamIds: this.filter.teamIds,
					skip: 0,
					take: 10000,
					type: Permissions.contract,
					companyIds: this.filter.companyIds
				})
				.subscribe((res) => {
					this.staffs = res.data

					if ($event.updateData) {
						$event.updateData(res.data)
					}
				})
		}
	}

	public getContractStatus(key: Statuses, type) {
		if (key === Statuses.ContractActive && type === 1) {
			return 'common_status_contractactive'
		}

		if (key === Statuses.ContractActive && type === 2) {
			return 'common_filter_expiring'
		}

		if (key === Statuses.ContractNew && type === 3) {
			return 'common_filter_renewed'
		}

		if (key === Statuses.ContractNew && type === 4) {
			return 'common_filter_upcoming'
		}

		if (key === Statuses.ContractCompleted && type === 5) {
			return 'common_status_contractcompleted'
		}

		if (key === Statuses.ContractCancelled && type === 6) {
			return 'common_status_contractcancelled'
		}
	}

	public getStatusId(key: Statuses, type) {
		if (key === Statuses.ContractActive && type === 1) {
			return Statuses.ContractActive
		}

		if (key === Statuses.ContractActive && type === 2) {
			return Statuses.ContractExpiring
		}

		if (key === Statuses.ContractNew && type === 3) {
			return Statuses.ContractNew
		}

		if (key === Statuses.ContractNew && type === 4) {
			return Statuses.ContractUpcoming
		}

		if (key === Statuses.ContractCompleted && type === 5) {
			return Statuses.ContractCompleted
		}

		if (key === Statuses.ContractCancelled && type === 6) {
			return Statuses.ContractCancelled
		}
	}
}
