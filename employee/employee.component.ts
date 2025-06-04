import {
	ChangeDetectorRef,
	Component,
	ElementRef,
	EventEmitter,
	OnInit,
	Output,
	Input,
	ViewEncapsulation,
	signal,
	HostListener,
} from '@angular/core'
import { DateFormat, PhraseService } from '@gofive/angular-common'
import { BaseComponent } from 'src/app/shared/component/base/base.component'
import { DropdownFilter } from '../shared/dropdown.model'
import { EmployeeFilterModel } from 'projects/administrator/src/app/models/team.model'
import {
	BasicFilter,
	Employee_List_Result,
	EmployeeDropdownFilter,
	Team,
	TypeDDLEmployeeGroup,
} from 'src/app/shared/model/venio.model'
import { Subject, Subscription, debounceTime, finalize, first, firstValueFrom } from 'rxjs'
import { Title } from '@angular/platform-browser'
import { Permissions } from 'src/app/shared/enum/permissions.enum'
import { EmployeeService } from '../service/employee.service'
import { AdministratorService } from 'projects/administrator/src/app/services/administrator.service'
import { FilterSharingService } from '../service/filter-sharing.service'
import { AvatarSize } from '@gofive/design-system-avatar'
import { EmployeeType, OrderBy } from '../shared/employee-type.enum'
import { Statuses } from 'src/app/shared/enum/statuses.enum'
import { DropdownEventArgs, FilterDataSource } from '@gofive/design-system-dropdown'
import { EmployeeTableFilter, EmployeeSalesManagerReport } from 'src/app/shared/model/venio.model'
import { Go5DropdownFilterEventArgs, Go5DropdownFilterSelectedEventArgs } from 'src/app/shared/interfaces'
import { Language } from 'src/app/shared/enum/language.enum'

@Component({
	selector: 'employee',
	templateUrl: './employee.component.html',
	styleUrls: ['./employee.component.scss'],
	encapsulation: ViewEncapsulation.None,
	standalone: false,
})
export class EmployeeComponent extends BaseComponent implements OnInit {
	@Input() employeeId: string
	@Output() navigateById = new EventEmitter<any>()
	private employeeSubscription: Subscription
	private currentFilterSubscription: Subscription
	private _baseSubscription$: Subscription
	private _getEmp: Subject<boolean> = new Subject()
	public typeLang = false
	public typeFilter: DropdownFilter[] = []
	public typeField = { text: 'filterType', value: 'id' }

	public index: number
	public Type: number = 0
	public employeeType: number
	public filterGroup: { [key: string]: Object }[] = []
	public fields: Object = { groupBy: 'category' }
	public employee: Employee_List_Result[] = []
	public filter: EmployeeFilterModel = new EmployeeFilterModel()

	public loading = false

	public Basicfilter: BasicFilter = new BasicFilter()

	public TypeDDLEmployeeGroup = TypeDDLEmployeeGroup

	public orderSorting: any = {
		name: '',
		lead: '',
		prospect: '',
		customer: '',
		activity: '',
		task: '',
		deal: '',
		chat: '',
		quotation: '',
		salesorder: '',
	}
	public tableRowIndex: number | null = null
	public isScrollLoading = signal(false)
	public isEmployeeLoading = signal(false)
	public isInitialLoading = true
	public isSummaryLoading = true
	public summaryReport: EmployeeSalesManagerReport | null = null
	public reportFilter: EmployeeTableFilter = new EmployeeTableFilter()
	public employeeList: any[] = []
	public teamFields: Object = { text: 'teamName', value: 'teamId' }
	public roleFields: Object = { text: 'text', value: 'value' }
	public filterEmployee: EmployeeDropdownFilter = new EmployeeDropdownFilter()
	public dataSourceFilter: FilterDataSource[] = [
		{
			text: 'common_team',
			value: 'teamIds',
			allowFiltering: true,
			fields: this.teamFields,
			dataSource: [],
		},
		{
			text: 'common_role_role',
			value: 'roleIds',
			allowFiltering: true,
			fields: this.roleFields,
			dataSource: [],
		},
	]

	public frozenCols = [
		{
			field: 'fullname',
			header: 'common_employee_name',
			cssClass: 'text-left justify-content-start',
			isShowTooltip: false,
			allowTooltip: true,
			orderValue: 'name',
		},
	]

	public columns = [
		{
			id: 1,
			field: 'totalLeads',
			header: 'common_lead',
			width: '100px',
			isShowTooltip: false,
			allowTooltip: true,
			cssClass: 'text-center justify-content-center',
			warningField: 'notFollowedUpLeads',
			overdueField: 'overdueLeads',
			orderValue: 'lead',
		},
		{
			id: 2,
			field: 'totalProspects',
			header: 'common_customer_prospect',
			width: '100px',
			isShowTooltip: false,
			allowTooltip: true,
			cssClass: 'text-center justify-content-center',
			warningField: 'noDealProspects',
			orderValue: 'prospect',
		},
		{
			id: 3,
			field: 'totalCustomers',
			header: 'common_customer',
			width: '100px',
			isShowTooltip: false,
			allowTooltip: true,
			cssClass: 'text-center justify-content-center',
			orderValue: 'customer',
		},
		{
			id: 4,
			header: 'all_state_ongoing',
			width: '640px',
			isShowTooltip: false,
			allowTooltip: true,
			cssClass: 'text-center',
			children: [
				{
					id: 5,
					field: 'totalCustomerActivities',
					header: 'common_activity',
					width: '100px',
					cssClass: 'text-center justify-content-center',
					height: '60px',
					overdueField: 'overdueCustomerActivities',
					orderValue: 'activity',
				},
				{
					id: 6,
					field: 'pendingTasks',
					header: 'common_task',
					width: '100px',
					cssClass: 'text-center justify-content-center',
					height: '60px',
					overdueField: 'overdueTasks',
					orderValue: 'task',
				},
				{
					id: 7,
					field: 'inProgressDeals',
					header: 'common_deal',
					width: '100px',
					cssClass: 'text-center justify-content-center',
					height: '60px',
					overdueField: 'overdueDeals',
					orderValue: 'deal',
				},
				{
					id: 8,
					field: 'ongoingChats',
					header: 'common_chat',
					width: '100px',
					cssClass: 'text-center justify-content-center',
					height: '60px',
					orderValue: 'chat',
				},
				{
					id: 9,
					field: 'inProgressQuotations',
					header: 'common_quotation',
					width: '120px',
					cssClass: 'text-right justify-content-end',
					height: '60px',
					value: 'inProgressQuotationsValue',
					overdueField: 'overdueQuotations',
					valueOverdueField: 'overdueQuotationsValue',
					orderValue: 'quotation',
				},
				{
					id: 10,
					field: 'inProgressSalesOrders',
					header: 'common_salesorder',
					width: '120px',
					cssClass: 'text-right justify-content-end',
					height: '60px',
					value: 'inProgressSalesOrdersValue',
					orderValue: 'salesorder',
				},
			],
		},
	]

	get Language() {
		return Language
	}

	get CurrentLang() {
		return BaseComponent.languages
	}

	get DateFormat() {
		return DateFormat
	}

	get EmployeeType() {
		return EmployeeType
	}

	get AvatarSize() {
		return AvatarSize
	}

	get GetOrderBy() {
		return OrderBy
	}

	private searchSubject: Subject<string> = new Subject<string>()

	constructor(
		public elementRef: ElementRef,
		public phraseService: PhraseService,
		public _cdr: ChangeDetectorRef,
		private employeeService: EmployeeService,
		private filterSharingService: FilterSharingService,
		private titleService: Title,
		private administratorService: AdministratorService,
	) {
		super(elementRef, phraseService, _cdr)
	}

	public fieldSupervisor = { text: 'fullName', value: 'id', picture: 'picture' }
	public fieldSupervisor_EN = { text: 'fullName_EN', value: 'id', picture: 'picture' }
	public currentSupervisorId: any = 0
	public currentSupervisor: any = null
	public isTH: boolean = true
	public permissionAccessAllEmployee = { allowGrant: true }
	public supervisorModel: any[] = []
	public hasMoreData = true

	async ngOnInit(): Promise<void> {
		await firstValueFrom(BaseComponent.subjectLanguagesEvent)
		this._baseSubscription$ = this.isDoneLoading$.pipe(first((val) => val)).subscribe((value) => {
			if (BaseComponent.currentUsers) {
				this.typeFilter = []
				if (this.hasPermissions(Permissions.ManageConfiguration)) {
					this.typeFilter.push({
						id: TypeDDLEmployeeGroup.Admin,
						filterType: TypeDDLEmployeeGroup[TypeDDLEmployeeGroup.Admin],
					})
					this.Basicfilter.typeFilter = TypeDDLEmployeeGroup.Admin
				} else {
					this.Basicfilter.typeFilter = TypeDDLEmployeeGroup.All
					this.Type = TypeDDLEmployeeGroup.All
					this.filter.type = TypeDDLEmployeeGroup.All
				}
				if (value) {
					this.getRoles()
					this.getSalesManagerReport()
					this._getEmp.pipe(debounceTime(500)).subscribe(() => {
						this.getEmployee()
					})
				}
				this.typeFilter = this.typeFilter.concat(
					{ id: TypeDDLEmployeeGroup.All, filterType: TypeDDLEmployeeGroup[TypeDDLEmployeeGroup.All] },
					{ id: TypeDDLEmployeeGroup.MyTeam, filterType: TypeDDLEmployeeGroup[TypeDDLEmployeeGroup.MyTeam] },
					{ id: TypeDDLEmployeeGroup.OtherTeam, filterType: TypeDDLEmployeeGroup[TypeDDLEmployeeGroup.OtherTeam] },
				)

				if (this.employeeId) {
					this.openEmployeeDialog(this.employeeId)
				}
			}
		})
		this.currentFilterSubscription = this.filterSharingService.filterEmployee
			.pipe(debounceTime(300))
			.subscribe((res) => {
				this.triggerPayload(res)
			})

		this.searchSubject.pipe(debounceTime(300)).subscribe((searchText) => {
			this.reportFilter.searchText = searchText
			this.employeeList = []
			this.getSalesManagerReport()
		})
	}

	ngOnDestroy(): void {
		super.ngOnDestroy()
		this.employeeSubscription?.unsubscribe()
		this._baseSubscription$?.unsubscribe()
		if (this.currentFilterSubscription) {
			this.currentFilterSubscription?.unsubscribe()
			this.filterSharingService.setFilterEmployee(this.filter)
		}
		this._getEmp?.unsubscribe()
		this.searchSubject?.unsubscribe()
	}

	public onSelectedSupervisor(event: any): void {
		this.hasMoreData = true

		const selectedUserId = event?.selectValue || event?.selectedItem?.id || null

		this.currentSupervisorId = selectedUserId ? selectedUserId : 0
		this.currentSupervisor =
			this.supervisorModel.find((sup) => sup.id === this.currentSupervisorId) || this.supervisorModel[0]

		this.reportFilter.userIds = this.currentSupervisorId === 0 ? [] : [this.currentSupervisorId]

		this.employeeList = []
		this.getSalesManagerReport()
	}

	private getSalesManagerReport(): void {
		if (this.isEmployeeLoading()) return

		if (!this.isScrollLoading()) {
			this.isEmployeeLoading.set(true)
		}

		this.reportFilter.skip = this.employeeList?.length || 0
		this.reportFilter.take = 20

		this.employeeService
			.GetEmployeeSalesManagerReport(this.reportFilter)
			.pipe(
				finalize(() => {
					this.isScrollLoading.set(false)
					this.isEmployeeLoading.set(false)
					this.isInitialLoading = false
					this._cdr.markForCheck()
				}),
			)
			.subscribe(
				(res) => {
					if (!res.hasError && res.data) {
						if (res.data.length > 0) {
							this.employeeList = this.employeeList.concat(res.data)

							if (!this.summaryReport) {
								this.summaryReport = res.data[0]
							}

							if (res.data.length < this.reportFilter.take) {
								this.hasMoreData = false
							}
						} else {
							this.hasMoreData = false
						}
					}
					this.getSummaryData()
				},
				(error) => {
					console.error(error)
				},
			)
	}

	private getSummaryData(): void {
		this.isSummaryLoading = true;
		this.employeeService.GetEmployeeSalesManagerSummary(this.reportFilter).subscribe(
			(res) => {
				if (!res.hasError && res.data) {
					this.summaryReport = {
						...this.summaryReport,
						notFollowedUpLeads: res.data.totalNotFollowedUpLeads,
						overdueLeads: res.data.totalOverdueLeads,
						noDealProspects: res.data.totalNoDealProspects,
						overdueCustomerActivities: res.data.totalOverdueCustomerActivities,
						overdueTasks: res.data.totalOverdueTasks,
						overdueDeals: res.data.totalOverdueDeals,
						overdueQuotations: res.data.totalOverdueQuotations,
					}
				}
				this.isSummaryLoading = false;
			},
			(error) => {
				console.error('Error while fetching summary:', error)
				this.isSummaryLoading = false;
			},
		)
	}

	private hasPermissions(per: number): boolean {
		if (BaseComponent.currentUsers) {
			const permission = BaseComponent.currentUsers.permissions || []
			return permission.includes(per)
		}
		return false
	}

	private triggerPayload(data) {
		this.loading = true
		this.filter = data
		this.employee = []
		this.index = this.filter.type
		this.getTeam()
		this.getEmployee()
		this.loading = false
	}

	private getFilterGroup(res: Team[]) {
		this.filterGroup = [
			{
				id: EmployeeType.All,
				text: 'common_customer_filter_nofilter',
				cId: 1,
				category: 'Filter',
			},
			{
				id: EmployeeType.RecentlyCreated,
				text: 'customercentric_filter_sort_lastcreated',
				cId: 1,
				category: 'Filter',
			},
			{
				id: EmployeeType.RecentlyPlanned,
				text: 'customercentric_filter_sort_lastplan',
				cId: 1,
				category: 'Filter',
			},
			{
				id: EmployeeType.RecentlyActivity,
				text: 'common_employee_recently_activity',
				cId: 1,
				category: 'Filter',
			},
			{
				id: EmployeeType.RecentlyFeedback,
				text: 'common_employee_recently_feedback',
				cId: 1,
				category: 'Filter',
			},
			{
				id: EmployeeType.NeverVisited,
				text: 'common_employee_never_activity',
				cId: 1,
				category: 'Filter',
			},
			{
				id: '-1',
				text: 'common_customer_filter_nofilter',
				cId: 2,
				category: 'Group',
			},
		]
		res.forEach((s) => {
			this.filterGroup.push({
				id: s.teamId + '',
				text: s.teamName,
				cId: 2,
				category: 'Group',
			})
		})
		this.filterGroup = this.filterGroup.concat([
			{
				id: 'Active',
				text: 'common_active',
				cId: 3,
				category: 'Status',
			},
			{
				id: 'InActive',
				text: 'common_in_active',
				cId: 3,
				category: 'Status',
			},
		])
	}

	public resetFilterEmployee(): void {
		this.filterEmployee.searchText = ''
	}

	public getEmployee() {
		this.resetFilterEmployee()
		this.employeeService.GetAllEmployee(this.filterEmployee).subscribe(
			(res) => {
				if (!res.hasError && res.data) {
					this.supervisorModel = [
						{
							id: 0,
							fullName: 'common_all',
							fullName_EN: 'common_all',
							iconClass: 'gf-icon-user f-30 px-1',
						},
						...res.data.map((emp) => ({
							id: emp.userId,
							fullName: emp.fullname,
							fullName_EN: emp.fullnameEn,
							picture: emp.pictureUrl,
						})),
					]

					if (!this.currentSupervisor) {
						this.currentSupervisor = this.supervisorModel[0]
						this.currentSupervisorId = 0
					}
				}
			},
			(error) => {
				console.error(error)
			},
		)
	}

	public getTeam() {
		this.employeeService.GetTeamForEmployee(this.index).subscribe(
			(res) => {
				this.getFilterGroup(res)
				this.setDataSourceFilter('teamIds', res)
			},
			(error) => {
				console.log(error)
			},
		)
	}

	public compareDate(raDate: Date) {
		const date: Date = new Date(raDate)
		return date > new Date()
	}

	public onSelectedDdl(e) {
		if (e < 0) {
			this.filter.type = null
			this.Type = TypeDDLEmployeeGroup.All
		} else {
			this.filter.type = e
			this.Type = e || 0
		}
		this.index = e
		this.employee = []
		this._getEmp.next(null)
		this.getTeam()
	}

	public chActive(e) {
		const id = e.id
		if (e.cId === 1) {
			return id === this.filter.employeeType
		} else if (e.cId === 2) {
			return id === this.filter.teamId || (id === '-1' && this.filter.teamId === null)
		} else if (e.cId === 3) {
			return id === Statuses[this.filter.status]
		}
	}

	public onSearch(e) {
		this.hasMoreData = true
		const searchText = e === true ? '' : e.target.value
		this.searchSubject.next(searchText)
	}

	public onDropdownSupervisorClosed(): void {
		this.getEmployee()
	}

	@HostListener('window:scroll', [])
	public onTableScroll(): void {
		const scrollTop = window.scrollY || document.documentElement.scrollTop
		const scrollHeight = document.documentElement.scrollHeight
		const clientHeight = document.documentElement.clientHeight
		const isReachBottom = scrollTop + clientHeight >= scrollHeight - 5

		if (this.isScrollLoading() || this.employeeList.length === 0 || !this.hasMoreData || !isReachBottom) {
			return
		}

		this.isScrollLoading.set(true)
		this.getSalesManagerReport()
	}

	private setDataSourceFilter(key: string, data: any[]) {
		const filter = this.dataSourceFilter.find((f) => f.value === key)
		if (filter) {
			filter.dataSource = data
		}
		this.dataSourceFilter = [...this.dataSourceFilter]
	}

	public onFilteringDropdown($event: Go5DropdownFilterEventArgs): void {
		const filterType = $event?.value
		const searchText = $event?.text ?? ''

		if (filterType === 'roleIds') {
			this.administratorService
				.RolesCore({
					sortBy: 'roleName',
					sortDir: 'ASC',
					keyword: searchText,
					companyId: 0,
					statuses: [1],
				})
				.subscribe({
					next: (res) => {
						const rolesData = res.map((role) => ({
							text: role.roleName,
							value: role.id,
						}))

						if ($event.updateData) {
							$event.updateData(rolesData)
						}
					},
					error: (err) => {
						console.error(err)
						if ($event.updateData) {
							$event.updateData([])
						}
					},
				})
		}
	}

	public onFilteringSupervisor($event: Go5DropdownFilterEventArgs): void {
		this.resetFilterEmployee()
		this.filterEmployee.searchText = $event?.text ?? ''

		if ($event.updateData) {
			$event.updateData([])
		}

		this.employeeService.GetAllEmployee(this.filterEmployee).subscribe({
			next: (res) => {
				if (!res.hasError && res.data) {
					const newData = res.data.map((emp) => ({
						id: emp.userId,
						fullName: emp.fullname,
						fullName_EN: emp.fullnameEn,
						picture: emp.pictureUrl,
					}))

					this.supervisorModel = [
						{
							id: 0,
							fullName: 'common_all',
							fullName_EN: 'common_all',
							iconClass: 'gf-icon-user f-30 px-1',
						},
						...newData,
					]

					if ($event.updateData) {
						$event.updateData(this.supervisorModel)
					}
				} else {
					if ($event.updateData) {
						$event.updateData([])
					}
				}
			},
			error: (err) => {
				console.error(err)
				if ($event.updateData) {
					$event.updateData([])
				}
			},
		})
	}

	public onSorting(field: string) {
		if (field !== '') {
			this.hasMoreData = true
			Object.keys(this.orderSorting).forEach((key) => {
				if (key !== field) {
					this.orderSorting[key] = ''
				}
			})

			const currentSorting = this.orderSorting[field]
			if (!currentSorting || currentSorting === '') {
				this.orderSorting[field] = 'ORDER'
				this.reportFilter.sortBy = field
				this.reportFilter.sortOrder = 'ASC'
			} else if (currentSorting === 'ORDER') {
				this.orderSorting[field] = 'ORDER DESC'
				this.reportFilter.sortBy = field
				this.reportFilter.sortOrder = 'DESC'
			} else if (currentSorting === 'ORDER DESC') {
				this.orderSorting[field] = 'ORDER'
				this.reportFilter.sortBy = field
				this.reportFilter.sortOrder = 'ASC'
			}

			this.employeeList = []
			this.getSalesManagerReport()
		}
	}

	private getRoles() {
		this.administratorService
			.RolesCore({
				sortBy: 'roleName',
				sortDir: 'ASC',
				keyword: '',
				companyId: 0,
				statuses: [1],
			})
			.subscribe(
				(res) => {
					const rolesData = res.map((role) => ({
						text: role.roleName,
						value: role.id,
					}))

					this.setDataSourceFilter('roleIds', rolesData)
				},
				(error) => {
					console.error('Error fetching roles:', error)
				},
			)
	}

	public onSelectedFilter(event: DropdownEventArgs) {
		this.hasMoreData = true
		const type: string = event?.data?.value

		if (type === 'teamIds') {
			const selectedTeamIds = event.value ?? []

			this.reportFilter.teamIds = selectedTeamIds

			this.employeeList = []
			this.getSalesManagerReport()
		}

		if (type === 'roleIds') {
			const selectedRoleIds = event.value ?? []

			this.reportFilter.roleIds = selectedRoleIds

			this.employeeList = []
			this.getSalesManagerReport()
		}
	}

	public onTooltip(event: MouseEvent, width: string, column: any): void {
		const element = event.target as HTMLElement
		if (event.type === 'mouseleave') {
			column.isShowTooltip = false
			this._cdr.detectChanges()
			return
		}

		const isEllipsisActive = element.offsetWidth < element.scrollWidth
		column.isShowTooltip = isEllipsisActive
		this._cdr.detectChanges()
	}

	public onTooltipBody(event: MouseEvent, width: string, column: any, value: any, rowIndex: number): void {
		const element = event.target as HTMLElement
		if (event.type === 'mouseleave') {
			column.tooltipStates = column.tooltipStates || {}
			column.tooltipStates[`${rowIndex}`] = false
			this._cdr.detectChanges()
			return
		}
		const isEllipsisActive = element.offsetWidth < element.scrollWidth

		column.tooltipStates = column.tooltipStates || {}
		column.tooltipStates[`${rowIndex}`] = isEllipsisActive && value !== 0
		this._cdr.detectChanges()
	}

	openEmployeeDetailDialog(employeeId: string) {
		this.openEmployeeDialog(employeeId)
	}

	public activeHoverIndex(currentIndex: number) {
		this.tableRowIndex = currentIndex
	}

	public onClearAll(event) {
		this.dataSourceFilter.forEach((filter) => {
			console.log(filter)
			const key = filter.value
			this.reportFilter[key] = []
		})
		this.employeeList = []
		this.getSalesManagerReport()
	}
}
